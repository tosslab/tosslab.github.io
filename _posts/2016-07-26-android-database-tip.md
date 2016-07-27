---
layout: post
title: "Android 의 Sqlite Tip"
author: steve
categories: [android]
description: 안드로이드에서 Sqlite 를 사용하는 소소한 팁입니다.
tags: [android, sqlite]
fullview: true
---

# Android 와 Sqlite

Android 에서 Sqlite 는 오랫동안 사용되어 왔습니다. 지금은 Realm 과 그외의 데이터베이스들이 그 위치를 넘보고 있지만 여전히 사용되고 있음은 틀림없습니다.

현재 Jandi 는 서버의 대다수 정보를 앱의 Sqlite-Database 에 Cache 를 하고 있습니다. 따라서 Sqlite 를 얼마나 잘 분리하고 제어하느냐가 앱 자체의 라이프사이클에 큰 영향을 미칩니다.

오늘은 Android 팀이 Sqlite 를 어떻게 사용하는지 공유해드리고자 합니다.


## 1. ORM
안드로이드만 하신 분들에게는 다소 생소한 개념일 수 있지만 다른 분야에서는 널리 사용되고 있습니다.

Android 에서 Sqlite 는 Database 용 Access 객체를 통해서 column/row 단위로 정보를 가져와서 객체를 완성합니다. 하지만 Access 객체에 일일이 Query 를 작성하는 것은 실수가 많을 뿐더러 column/row 단위 정보 매핑 작업은 매우 불편하고 지루하며 잠재적 버그를 내포한 작업니다.

그러기 때문에 Object-Query-Databse 를 각각에 맞게 매핑해주는 라이브러리들 통해 단순하고 반복적인 작업을 간단하게 회피할 수 있습니다.

아래의 블로그들이 Sqlite-Orm 라이브러리를 사용하는 좋은 정보들이 될 것입니다.
현재 Jandi-Android 의 주요 Orm 라이브러리는 OrmLite 입니다.

[Sqlite-Orm : 네이버 기술블로그](http://d2.naver.com/helloworld/472196)

[GreenDao Benchmark](http://greenrobot.org/android/android-orm-performance-2016/)

[Realm Database](https://realm.io/)

## 2. Database-Access

### 유사 관심사 Domain 끼리 묶음

수많은 데이터를 테이블로 관리하다보면 많은 Database-Access-Object(DAO) 가 필요합니다. 하지만 자세히 들여다보면 관계된 것끼리의 묶음이 생기게 되며 이를 묶어서 하나의 Access 객체를 만들 수 있습니다.

Jandi 의 메시지는 크게 Text, File, Sticker 로 구분되어 있으며 이에 대한 상위로 Message 라는 개념이 있습니다. Text, File, Sticker 는 하위에 각각 2~3개의 Table 로 구성되어 있습니다.
이 전체를 각각 분리해서 관리하면 그에 따른 부수적인 제어 코드들이 불가피 하기 때문에 Jandi 에서는 최상위 Message 도메인에 맞춰서 하나의 묶음으로 관리하였습니다.

![Message Domain](/assets/media/post_images/message_domain.png)

코드는 다음과 같은 형태를 띄고 있습니다.

```java
public class MessageRepository {
  public List<Message> getMessages(/*args...*/) { /*코드 생략*/};
  public Message save(/*args...*/) { /*코드 생략*/};
  public Message update(/*args...*/) { /*코드 생략*/};
  public Text getText(/*args...*/) { /*코드 생략*/};
  /*이하 생략*/
}
```

이러한 형태로 독립성을 가질 수 있는 최상위 Domain 을 기준으로 Repository 클래스를 가지고 있습니다.

## 3. Repository 요청 관리하기

위의 모습처럼 관심사별로 Domain 을 분리한 이유 중 가장 큰 이유는 Domain 단위로 요청을 관리하기 위함입니다.

Android-Sqlite 는 내부적으로 Read-Write lock 을 가지고 있지만 신뢰도가 높다 할 수 없으며 다양한 테이블에 동시 접근하는 경우 오류가 나지 않을 것이라 보장할 수 없습니다.

따라서 보장이 안될바에 1번에 1개의 요청만 처리 할 수 있도록 Domain 단위로 요청을 제한해버리자는 결론을 냈습니다.

그러기 위해 2가지 코드를 사용하였습니다.

1. Lock 객체 사용
2. 요청을 래핑할 template interface 사용하기

멀티 쓰레드로 요청을 처리할 때 Lock 객체를 통해 1번의 1개씩의 동작만 할 수 있도록 하였으며 이를 좀 더 쉽게 쓸 수 있도록 하기 위해 Template Interface 를 만들었습니다.

```java
public class LockTemplate {
  private Lock executorLock;
  LockTemplate() {
    executorLock = new ReentranceLock();
  }
  protected <T> T execute(Executable<T> e) {
    executorLock.lock();
    try {
      return e.execute();
    } finally {
      executorLock.unlock();
    }
  }

  interface Executable {
    <T> T execute();
  }
}
```

위와 같은 클래스를 만들고 앞서 만든 Repository 클래스에 상속받도록 하였습니다.

![LockTemplate](/assets/media/post_images/locktemplate_uml.png)

코드는 다음과 같습니다.

```java
public class MessageRepository extends LockTemplate {
  /*싱글톤으로 동작하도록 합니다. 코드 생략*/
  public List<Message> getMessages(long roomId) {
    return execute(() -> {
      return dao.query(roomId);
    });
  }

  public int save(List<Message> messages) {
    return execute(() -> {
      return dao.save(messages);
    });
  }
}
```

위와 같이 함으로써 최종적으로 같은 Repository 에 멀티쓰레드에서 요청을 하여도 1개의 처리만 할 수 있도록 원천적으로 작업하였습니다.

## 정리

Android 에서 Sqlite 는 Mysql 이나 PostSQL 과 유사한 RDBMS 를 제공하는 DB 툴입니다. 하지만 기본적인 사용이 매우 번거러울 뿐만 아니라 메모리릭과 오류에 매우 쉽게 노출됩니다. 그래서 다음과 같은 방법을 통해 최소한의 안전망을 구현했습니다.

1. ORM 을 사용하라.
 - 반복적이고 DB 접근 과정에서 오류를 최소화 시켜줍니다.

2. Lock 을 의도적으로 사용하라.
 - 멀티쓰레드 접근에 의한 오류를 최소화 합니다.
 - synchroized 보다는 concurrent 패키지에서 제공해주는 Lock 을 사용해주세요.
