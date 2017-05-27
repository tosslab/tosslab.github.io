---
layout: post
title: "Radix? Redis!"
author: hugo
description: rax 코드를 읽어보고 redis에서 어떻게 사용되는지 알아보겠습니다.
tags: [redis]
fullview: true
---

얼마전부터 antirez twitter에서 radix 관련된 트윗이 올라왔습니다. 얼마 지나지 않아 antirez가 radix를 구현한 [rax](https://github.com/antirez/rax) 프로젝트 공개 및 [redis의 cluster hash_slot의 저장구조를 radix tree로 수정](https://github.com/antirez/redis/commit/1409c545da7861912acef4f42c4932f6c23e9937)한걸 보게 되었습니다.(놀라운 추진력...)
그동안 antirez의 코드로 배우는 게 많았고, 개인적으로 자료구조에 관심이 많아서 살펴보기 시작했습니다. 이번 포스트는 프로젝트 경험이 아닌 단순히 저의 호기심을 시작으로 하나씩 알아가는 과정을 적었습니다.

antirez는 radix tree를 어떻게 구현했는지 알아보고, rax를 redis에 어떻게 적용하였는지 알아보겠습니다.
radix tree 구현을 알아보기 전에 왜 radix tree가 필요해졌는지 알아보겠습니다.

redis의 cluster 기능부터 시작됩니다.


# Redis Cluster?
redis에는 [Cluster](https://www.slideshare.net/iammutex/redis-cluster) 기능이 있습니다. 6대 이상의 노드를 cluster 구성하면(최소 leader 3대, follower 3대) 16384개의 hash_slot이 노드 갯수에 맞게 분배가 됩니다. 예를 들어 3대의 leader로 cluster 구성하면 각 leader 노드는 0-5460, 5461-10922, 10923-16383 hash_slot을 가지게 됩니다.
 
cluster를 구성한 이후 client가 데이터 저장/삭제/조회 명령어를 server에 전송할때 마다 아래 계산을 통해 hash_slot을 구하고 어떤 노드에서 실행할지 찾습니다.
```
# example: 127.0.0.1:7000> set hello world
hash_slot = crc16("hello") & 0x3FFF 
```
client가 현재 접속한 노드라면 그대로 실행되지만 계산된 hash_slot이 다른노드에 있다면 에러를 발생하고 다른 노드로 가라는 힌트를 줍니다.

cluster 구성 후 노드를 추가 하거나 제거 할 경우 (장애가 나서 제거된 경우도 포함) hash_slot을 재분배 해야합니다. 단순하게 생각하면 전체 key에 대해서 hash_slot을 다시 계산하고 hash_slot에 맞게 노드에 재분배 하는 겁니다.
```java
[현재까지 저장된 keys].forEach(v => {
  hash_slot = crc16(v) & 0x3FFF
  //다시 계산된 hash_slot에 맞게 재분배 시작!!
})
```
하지만 antirez는 skiplist 을 이용하여 이 문제를 풀었습니다. score에는 hash_slot을 저장해서 hash_slot 으로 정렬해서 key를 저장하고 재분배가 필요해지면 재분배 하려는 hash_slot의 key만 조회한 후(hash_slot으로 정렬되어있기 때문에 간단해지겠죠?) 조회한 key들에 대해서 재분배를 진행합니다.

> [migrate using "getkeysinslot" command](https://github.com/antirez/redis/blob/3.2/src/redis-trib.rb#L935)


# 잘 짰구만 뭐가 문제냐?

dbAdd, dbDelete 가 실행될 때마다 key가 저장되고 지워집니다. 즉 저장되는 key 갯수가 증가하는 만큼 cluster hash_slot 메모리도 증가한다는걸 뜻합니다. cluster 구성한 redis에 key가 추가될수록 재분배를 위해 추가 메모리를 계속 사용한다는 것입니다.

또한 노드 추가 및 제거를 위해 [마이그레이션](https://redis.io/commands/migrate) 하는데 특정 hash_slot의 key를 가져오는 GETKEYSINSLOT 명령어에 이슈가 있습니다.
```
CLUSTER GETKEYSINSLOT slot count
```
특정 hash_slot에 속한 키 정보를 count 만큼 가져오는 명령어 입니다.
흥미로운 점은 사용자가 특정 hash_slot에 몇개의 key가 저장 되어있는지 모르니
count에 Integer.MAX 값을 넣으면 redis는 hash_slot에 실제로 저장된 key 갯수와는 상관없이 client로부터 전달된 count만큼 메모리를 할당합니다.

```c
} else if (!strcasecmp(c->argv[1]->ptr,"getkeysinslot") && c->argc == 4) {
        /* CLUSTER GETKEYSINSLOT <slot> <count> */
        long long maxkeys, slot;
        unsigned int numkeys, j;
        robj **keys;
// ... 명령어의 4번째 인자를 maxkeys에 할당, 즉 사용자가 입력한 count
        if (getLongLongFromObjectOrReply(c,c->argv[3],&maxkeys,NULL)
            != C_OK)
            return;
// ...
        keys = zmalloc(sizeof(robj*)*maxkeys);
        numkeys = getKeysInSlot(slot, keys, maxkeys);
        addReplyMultiBulkLen(c,numkeys);
        for (j = 0; j < numkeys; j++) addReplyBulk(c,keys[j]);
        zfree(keys);
```
> [zmalloc maxkeys](https://github.com/antirez/redis/blob/3.2/src/cluster.c#L4172)  
> [CLUSTER GETKEYSINSLOT unnecessarily allocates memory](https://github.com/antirez/redis/issues/3911)

메모리도 적게 차지하면서(압축 가능) hash_slot 단위로 저장이 가능하고 조회가 효과적인 자료구조가 필요했고 antirez가 결정한건 radix tree입니다.

※ 뜬금 없는데 2012년, [redis 자료형에 Trie를 추가한 P/R](https://github.com/antirez/redis/pull/717/files)이 생각났습니다.


# radix tree 구현한 rax 알아보기

시작하기전 [Radix tree (Wikipedia)](https://en.wikipedia.org/wiki/Radix_tree) 위키 페이지의 `그림`을 보고 감을 잡은 후에 아래를 보시면 잘 읽힙니다. 자! 이제부터 rax의 주석과 코드를 읽으면서 이해한 것들을 정리 해나가겠습니다.

## Node
rax의 노드 구성은 다음과 같습니다.
```c
typedef struct raxNode {
    uint32_t iskey:1;     /* Does this node contain a key? */
    uint32_t isnull:1;    /* Associated value is NULL (don't store it). */
    uint32_t iscompr:1;   /* Node is compressed. */
    uint32_t size:29;      /* Number of children, or compressed string len. */
    unsigned char data[];
} raxNode;
```
노드의 정보를 담고있는 32 bit int와 key/value 그리고 자식 노드의 포인터를 저장하는 char data[]가 있습니다. 특이한 점은 key/value 동일한 노드에 저장 되지 않고 key가 저장된 노드의 자식 노드에 value를 저장한다는 점입니다.

![](/assets/media/post_images/rax/raxNode1.png)
※ [사진 출처](https://en.wikipedia.org/wiki/Radix_tree)

위 그림을 예로 32 bit 정보가 어떤걸 의미하는지 알아보겠습니다.

iskey는 노드가 key의 종착역(iskey:1)인지 중간역(iskey:0)인지 나타내는 flag입니다.(어떻게 표현 할까 고심하다 생각났는데, 더 괜찮은게 있다면 알려주세요.) 종착역이라면 iskey:1 이고 중간역이라면 iskey:0 입니다.
1, 3 노드는 iskey:0 이고 2, 4, 5, 6, 7 노드는 iskey:1이 되겠네요.

isnull은 value의 null 여부를 표시합니다.

Trie는 각 노드에 한글자씩 표현 하지만 Radix는 압축을 통해 한 노드에 여러 글자 표현이 가능합니다. 이를 나태내는 플래그 iscompr 입니다. 노드가 압축된 노드(iscompr:1)인지 아닌지(iscomprL1)를 나타냅니다.

![](/assets/media/post_images/rax/raxNode.png)
※ 위에 있는 노드는 iscompr:0이고 아래에 있는 노드는 iscompr:1 입니다.

size는 iscompr 값에 따라 의미가 다릅니다. iscompr이 1인 경우엔 저장된 key의 길이를 의미하고 iscompr이 0인 경우엔 자식노드의 갯수(저장된 key의 갯수)를 의미합니다.

위 4개 정보를 이용해서 노드의 크기를 구하는 코드는 아래와 같습니다.
```c
/* sizeof(raxNode): 노드 정보를 표현하는 크기
   (n)->size: 저장된 key의 갯수(iscompr:0) or 저장된 key의 길이(iscompr:1)
   iscompr:1인 경우 자식노드 한개, iscompr:0인 경우 자식노드는 (n)->size
   iskey:1인 경우 데이터 가리키는 포인터 크기 하나 추가
*/

#define raxNodeCurrentLength(n) ( \
    sizeof(raxNode)+(n)->size+ \
    ((n)->iscompr ? sizeof(raxNode*) : sizeof(raxNode*)*(n)->size)+ \
    (((n)->iskey && !(n)->isnull)*sizeof(void*)) \
)
```

## Find

Find는 raxLowWalk 함수를 이용해 key가 존재 하는지 판단합니다.
```c
raxLowWalk(rax *rax, unsigned char *s, size_t len, raxNode **stopnode, raxNode ***plink, int *splitpos, raxStack *ts)
```
rax는 raxNew 함수를 통해 생성된 rax 포인터, s는 찾으려는 key, len은 s의 길이입니다. stopnode는 s에 적합한 노드를 순회하다 찾은 적합한 노드,
plink는 stopnode를 가리키는 부모노드의 포인터입니다. 그리고 splitpos는 s와 stopnode의 저장되어있는 key를 비교하는데 불일치가 발생한 인덱스(zero-based), 마지막으로 ts는 순회한 노드를 저장하는 stack 자료구조입니다.

* 예를들면 s가 "ANNIBALE"이고 stopnode에 저장되어있는 key가 "ANNIENTARE" 라면 splitpos은 4입니다.

s가 현재 rax에 저장되에 있는 key들과 비교하면서 어디까지 일치하는지 나타내는 인덱스를 리턴 합니다. raxLowWalk 함수를 그렸는데 마지막 파리미터 ts는 생략했습니다.(Remove에서 알아보겠습니다.)
![](/assets/media/post_images/rax/find1.png)

※ s가 끝까지 일치했을 경우입니다.

![](/assets/media/post_images/rax/find2.png)
※ s가 중간까지만 일치했을 경우입니다.

## Insert

마치 링크드 리스트 중간에 데이터 넣을때와 비슷합니다.
1. raxLowWalk 함수를 이용해서 저장할 key에 적합한 노드와 splitpos을 찾습니다.
2. raxLowWalk 리턴값과 splitpos, stopnode의 iscompr 값에 따라서 새로운 노드 생성 및 링크 연결을 합니다.

"ANNIBALE" -> "SCO" -> [] 저장되어있는 상태에서 "ANNIENTARE"를 저장하는 과정을 그려보았습니다.
![](/assets/media/post_images/rax/insert1.png)

※ raxLowWalk 함수를 실행해서 stopnode와 splitpos를 찾습니다. 위 그림 기준으로 "ANNIBALE"이 저장되있는 노드가 stopnode가 되고 splitpos는 4가 됩니다.

![](/assets/media/post_images/rax/insert2.png)

※ splitpos 기준으로 앞/뒤 노드 그리고 splitpos에 해당하는 노드, 총 3개를 생성하고 노드에 저장되어있던 key를 분리해서 저장합니다.

![](/assets/media/post_images/rax/insert3.png)

※ 변경된 노드에 알맞은 링크를 연결합니다.

![](/assets/media/post_images/rax/insert4.png)

※ stopnode부터 시작해서 key를 저장합니다.

## Remove

Remove도 링크드 리스트의 노드 삭제와 비슷합니다.
"TOASTING"과 "TOASTER"가 저장되어있다고 가정하고 "TOASTER" 삭제하는 과정을 그렸습니다.

![](/assets/media/post_images/rax/remove1.png)

※ 두 key가 저장되어 있는 모습입니다.

![](/assets/media/post_images/rax/remove2.png)

※ raxLowWalk 함수를 통해 stopnode를 찾습니다. 지금까지 안 보였던게 하나 보이는데요, key를 찾으면서 순회한 노드들을 저장하는 stack 자료구조 *ts입니다. 삭제 후 압축이 가능한지를 검사하기 위해 순회한 노드 정보를 담고 있습니다.

![](/assets/media/post_images/rax/remove3.png)

※ [특정 조건](https://github.com/antirez/rax/blob/f2cfcc08399d904179545bd9da776400fe1b41ce/rax.c#L932)을 만족할때까지 *ts에서 노드를 꺼내고 메모리 해제하는 과정을 반복합니다. 아래에서 위로 올라가면서 노드를 정리합니다. 이후 정리가 끝나면 압축 시작하는 노드를 찾습니다. 여기서는 *start가 압축을 시작하는 노드라고 생각하시면 되겠습니다.

![](/assets/media/post_images/rax/remove4.png)

※  *start부터 시작해서 압축이 가능한 노드들을 순회하며 압축 가능한 노드에 저장되어있는 key의 길이를 누적하고 누적된 길이에 맞는 노드를 생성 합니다. 그리고 앞에서 계산한 압축 가능한 key들을 저장합니다.

![](/assets/media/post_images/rax/remove5.png)

※ 생성된 노드의 부모노드와 자식노드를 알맞게 연결해주고, 기존 노드는 메모리 해제 합니다.


# Cluster 정보는 어떻게 저장되나?

hash_slot 단위로 저장되는 key가 어떻게 저장되었는지 알아보겠습니다.
```c
server.cluster->slots_keys_count[hashslot] += add ? 1 : -1;
    if (keylen+2 > 64) indexed = zmalloc(keylen+2);
    indexed[0] = (hashslot >> 8) & 0xff;
    indexed[1] = hashslot & 0xff;
    memcpy(indexed+2,key->ptr,keylen);
    if (add) {
        raxInsert(server.cluster->slots_to_keys,indexed,keylen+2,NULL,NULL);
    } else {
        raxRemove(server.cluster->slots_to_keys,indexed,keylen+2,NULL);
    }
```
slots_to_keys를 skiplist에서 rax로 자료구조를 변경하고, slots_keys_count 변수를 생성해 hash_slot의 갯수를 카운트 합니다.
그리고 `(hash_slot 2 byte) + key` 로 hash_slot의 key 정보를 넣고, 해당 hash_slot에 속한 key를 조회하는게 쉬워졌습니다.

redis에 rax를 적용하기 전과 후의 실제 메모리 사용량이 궁금해서 1 만개의 데이터를 넣는 테스트를 해보았습니다. key는 uuid, value는 숫자 1로 넣어보고 key를 TOSSLAB_JANDI_%NUM 으로도 넣어봤는데 큰 차이가 나지 않았습니다. 오히려 skiplist를 사용한게 rax 적용한것보다 메모리를 조금 더 적었습니다.(1K 정도) 
'아무래도 slots_keys_count 변수가 생긴것, 노드를 생성하는것 자체도 메모리 차지, 그리고 1만 개로는 충분한 테스트가 아닌것 같다' 라는 막연한 추측이 있습니다.

GETKEYSINSLOT의 이슈는 slots_keys_count 변수로 해결했고, rax 적용해도 메모리 사용량이 큰 차이가 나는것도 아닌데 어떤 이점이 있을까 생각해봤습니다.
바로바로 redis에 `계층구조`가 생긴다는 점 같습니다. 더 나아가 중복이 심하면 심할수록 메모리가 절약되는 놀라운 부수적인 효과도 따라옵니다.
현재 잔디에서는 Redis를 다양한 서비스 로직에서 prefix로 구분지어 사용하고 있습니다. rax가 적용되면 어떤 변화가 생길지 기대가 됩니다.

# 마치며

rax 구현과 rax가 어떻게 redis에 적용됐는지 보면서 오랜만에 재밌게 코드를 읽은것 같습니다. 개인적으로 유용한 무언가를 만드는게 목표인데, 이런 좋은 코드들을 하나 둘씩 제것으로 만드는것도 하나의 과정이라 생각하며 진행했습니다.

앞으로 rax가 redis에서 어떻게 쓰일지 흥미롭고 Redis를 Saas 형태로 제공하는 업체들이 언제 적용할지도 궁금합니다.

긴 글 읽어주셔서 감사합니다.


cluster/rax 관련 antirez twitter
> [Redis Cluster Insertion cluster Issue](https://twitter.com/antirez/status/836241341277425666)  
> [same amount data hash table vs radix tree](https://twitter.com/antirez/status/839059978510020612)  
> [hashset + ziplist -> radix tree + listpack  1/5](https://twitter.com/antirez/status/849980542858784768)  
> [replace Hashset with Radix tree](https://twitter.com/antirez/status/836245276390211584)

raxNode에서 사용한 flexible member
> [flexible member](https://gcc.gnu.org/onlinedocs/gcc/Zero-Length.html) 
