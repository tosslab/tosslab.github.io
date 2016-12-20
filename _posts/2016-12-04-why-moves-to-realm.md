---
layout: post
title: "왜 SQLite 에서 Realm 으로 옮겼는가?"
author: steve
categories: [android]
description: 안드로이드 팀이 Realm 으로 옮긴 이유를 공유하고자 합니다.
tags: [android, realm, sqlite]
fullview: true
---

# SQLite 와 Realm

잔디 앱은 2015년 중반부터 앱 내에 Offline Caching 기능이 포함되면서 본격적으로 Local-Databae 를 사용하기 시작했습니다.

당시에 Realm 과 SQLite 를 검토하는 과정에서 다음과 같은 사유로 Realm 을 포기하였습니다.

> 1. 1.0 이 아직 되지 않은 미성숙된 상태의 라이브러리
> 2. 사용 사례에서 리포팅되는 버그들 (CPU 지원 등)
> 3. Data 의 상속을 지원하지 않는 문제
> 4. Robolectric 미지원 (안드로이드 팀 당시 테스트 프레임웍은 Robolectric 이었으며 현재 Android Test Support Library 입니다.)

위의 문제로 인해 SQLite 를 선택하였고 여러 SQLite-ORM Library 를 검토한 후 ORMLite 를 선택하였습니다.

## 누구보다 가볍고 빠르게

2016년 6월경 앱의 핵심 데이터에 대해 개선작업이 되면서 그에 따라 기존의 Cache Data 로직도 많은 부분이 변경되었습니다. 그에 따라 실시간성으로 DB 를 대상으로 Read-Write 동작이 발생하게 되었습니다. Locking 등에 대한 처리가 되면서 성능에 대한 이슈가 계속적으로 발생할 수 밖에 없었습니다.

간헐적인 성능 이슈는 사용자에게 나쁜 UX 로 다가갈 수 있기 때문에 다음과 같은 병목지점들에 대해 성능 향상을 꾀하였습니다.

> 1. 서버와의 통신 향상
> 2. 비지니스 로직 개선
> 3. 내부 DB 로직 향상

* 서버와의 통신 향상

  병목 지점이 되는 것으로 판단되는 API 를 찾아 원인을 분석하여 개선요청을 서버팀에서 개선할 수 있도록 하였습니다.

* 비지니스 로직 개선

  불필요한 객체 생성, 비동기로 처리해도 되는 동작들에 대해서는 로직 수정, 최소한의 검증 후에만 앱 실행, 네트워크 동작 최소화, 캐싱 활용 등 다양한 전략을 시도하였습니다.

* 내부 DB 로직 향상

  SQLite 를 대상으로 빈번한 쿼리 작업을 최소한으로 하기 위해 2~3개의 쿼리로 이루어진 부분에 대해서 최소한의 쿼리만으로 동작하도록 여러 시도를 하였습니다.

## ORMLite 의 한계점

ORMLite 를 대상으로 여러가지 시도를 하였습니다. 쿼리를 최소한으로 하고 1:N, N:M 동작에 대해서 로직 중간에 Query 가 발생하지 않도록 애초에 Join Query 를 하도록 하는 등 여러가지 전략을 시도하였으나 궁극적으로 ORMLite 자체에 대한 성능을 개선하는 것은 불가능하다는 결론이 도출하였습니다.

> 여러 시도를 하였으나 고작 10~20% 정도의 성능향상밖에 없었으며 이는 사용자 관점에서 여전히 느릴 수 있다고 느끼기 충분한 수준이었습니다.
> 기존에 목표했던 100ms 이하의 쿼리를 기대하기엔 어려운 상황이었습니다.

그래서 GreenDAO, Requery 라이브러리를 검토하였습니다.

* GreenDAO 의 문제점

  GreenDAO 를 검토하는 과정에서 겪은 가장 큰 문제점은 실제 Object 코드에 GreendDAO 코드가 생성이 붙으면서 유지보수에 큰 걸림돌이 될 수 있다는 것이 예상되었습니다.

* Requery 의 문제점

  성능면에서 ORMLite 에 비해서 큰 개선을 가져오지 못했습니다. Requery 는 JPA 를 가장 잘 채용한 것으로 알려져 있지만 그렇다고 SQLite 자체의 성능을 극적으로 개선했다고 보기엔 어려운 부분들이 있었습니다.

## SQLite vs Realm

SQLite 가 가진 자체적인 성능 이슈를 SQLite 기반 라이브러리 범위안에서는 개선할 수 없다는 결론에 도달하였습니다.

* 검토 방법 : 기존의 Object 를 대상으로 ORMLite 와 Realm 을 대상으로 성능을 검토합니다.

  1. 데이터는 1:N / 1:1 관계가 되어 있는 여러 Object 의 집합으로 구성되어 있다.
  2. Database 에서 데이터를 가져올 때는 Eager Loading 방식으로 택한다.
  3. Write : 20회, Read : 20회 를 수행했고 그에 대한 평균 성능을 비교한다.

![SQLite vs Realm](/assets/media/post_images/sqlite_vs_realm.png "SQLite vs Realm")

|       | SQLite | Realm | 성능 향상 |
|-------|--------:|-------:|-------:|
| Write | 4039ms   | 1142ms   | 3.5x |
| Read  | 6010ms    | 2450ms     | 2.5x |

(Realm 의 벤치마크 정보와 너무 상이하여 재테스트한 결과 수정하였습니다.)

위의 비교차트에서 봤듯이 Realm 은 무시무시한 성능이 입증되었습니다.

도입 검토시에 Realm 버전은 2.0 이었기 때문에 충분히 신뢰할 수 있을 만큼 성숙되었다고 판단하고 최종적으로 도입을 결정하였습니다.

## Realm 도입 과정에서 문제점

Realm 을 도입한다고 해서 여전히 잠재적인 문제가 해결된 것은 아니었습니다.

파악된 다음 문제를 해결 해야 했습니다.

> 1. Primitive 타입에 대해 Collection 저장을 지원하지 않는다.
> 2. RealmObject 에 대한 호출 Thread 를 유지해야 한다.
> 3. 상속을 지원하지 않는다.

* Primitive 타입에 대한 Collection 관리를 해결하기

  이 문제는 ORMLite 에서 이미 겪었기 때문에 의외로 쉽게 구할 수 있었습니다. long, int 등에 대한 Wrapper 를 만들고 Json Convert 등의 과정에서 Post Processing 과정에서 Wrapper 로 데이터를 이관하도록 처리하였습니다.

```java
// example
class Data extends RealmObject {
  private transient List<Long> refs;
  private List<RealmLong> refIds;
}

class RealmLong extends RealmObject {
  private long value;
}
```

* RealmObject 에 대한 호출 Thread 분리

  Realm 은 Object 에 대해 query 후 객체를 받는다 하더라도 실제로 객체 내 데이터르 접근할 때는 다시 Query 로 접근하기 때문에 실제로 Object 전체에 대해서 Eager Loading 방식으로 접근해야 합니다.

  Jandi 는 싱글톤 객체를 통해 데이터베이스에 접근하며, Background Thread 에서 진행하고 UI Thread 에서 객체 내 변수에 접근해서 UI 에 그리는 작업이 빈번하기 때문에 Thread 독립을 반드시 해야했습니다.

  Realm 에서는 Eager-Loading 을 지원하고 있습니다. `Realm.copyFromObject()` 를 사용하면 Return 값이 Eager-Loading 된 Object 가 반환됩니다.

  단, Realm 의 가장 큰 특징이로 보는 ZeroCopy 를 포기하는 것이기 때문에 신중하게 생각해야 합니다.

```java
// example
public Chat getChat(long chatId) {
    return execute((realm) -> {
        Chat it = realm.where(Chat.class)
                .equalTo("id", chatId)
                .findFirst();
        if (it != null) {
            return realm.copyFromRealm(it);
        } else {
            return null;
        }
    });
}

```

* 상속을 지원하지 않는다.

  가장 큰 문제였는데 해결방법을 찾을 수 없어 결국 상속을 포기하고 모든 Data 를 1개의 Object 에 표현하기로 하였습니다.

위의 3가지 문제를 이렇게 해결해서 안드로이드팀에서는 1차적으로 도입을 완료하였습니다.

## 결론

현재까지 Realm 전환에 있어서 성공적인 도입으로 판단되어 차후에 다른 데이터에 대해서도 하나씩 DB 이전을 할 예정입니다.

Realm 은 이제 충분히 신뢰할 수 있을만큼 성숙되었다고 생각이며 Realm 에서 처음부터 강조하던 성능또한 믿기 어려울 정도로 빨라졌습니다. 더 빠른 Mobile Database 를 원하신다면 Realm 을 적극 추천합니다.
