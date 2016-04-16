---
layout: post
title: "Retrofit2 로 전환"
author: steve
categories: [android]
description: 토스랩 안드로이드 앱이 Retrofit2 로 전환하면서 생겼던 이슈에 대해 정리하였습니다.
tags: [android, retrofit2, retrofit]
fullview: true
---

# Android 와 Network

Android 에서 Network 라이브러리들은 다양하지만 근 1년 사이에 주로 사용되는 라이브러리들이 점차적으로 적어지고 있습니다.

오늘은 그 중에서 Retrofit 에 대해 이야기 하고자 합니다.

# 토스랩의 Android Network Library

## 1. Spring-Android, Retrofit 그리고  Retrofit2
토스랩은 총 3개의 네트워크 라이브러리를 사용하였습니다. 초창기에는 AndroidAnnotations 에 연동되어 있는 Spring-Android 를 사용하였습니다. 하지만 다중 쓰레드 환경에서 동일한 Request 객체를 사용하면서 저사양 단말에서 문제로 두각되기 시작하였습니다.

그래서 Retrofit 으로 2015년 중순쯤 전환을 하였습니다. 그러다 2016년 초 Retrofit2 가 정식 배포가 되면서 자연스럽게 Retrofit2 로의 전환이 대두되기 시작하였습니다. 전환의 이유는 내부의 네트워크 모듈에 대한 Refactoring 이었는데 그와 동시에 Retrofit2 로의 전환도 함께 진행되었습니다.

## 2. 이슈들

### What the CALL<T>

기존의 Retrofit 은 200~399 에러에 대해서는 정상적인 Body 를 반환하고 400 이상의 경우에는 Typed Exception 형태로 로직을 진행하였습니다. 하지만 이정도로는 Response Status 나  Header 정보를 알기에는 추가적인 로직이 필요로 하였습니다. 물론 Success 케이스에도 마찬가지이긴 하였습니다.

이는 Retrofit 의 기본적인 목적에 부합되지 않는다는 문제가 있었습니다. Retrofit 의 가장 기본적인 목적은 Okhttp 의 상위 구현체로써 쉽게 Request 와 Response 를 구현한다는 것입니다. 손쉬운 구현이 필요한 정보를 제외시킨다는 것은 별개의 문제이기 때문입니다.

그래서 Retrofit2 에서는 Call 객체를 통해서 Request 와 Response 에 적용된 Header, StatusCode, Body 등을 직접 접근 할 수 있도록 인터페이스를 추가하였습니다.

이 객체는 불변성을 가지고 있기 때문에 Getter 만이 존재하며 Request 에 필요한 정보는 다른 부분에서 적용되어야 함을 명시하셔야 합니다.

### Call 객체의 적용

Call 객체를 적용하는 과정에서 2가지의 이슈가 있었습니다.

1. Interface 의 모든 Return Value 를 Call<T> 로 전환할 것
2. Request Error 를 직접 핸들링 하도록 수정해야 함

이 2가지 때문에 여러가지가 연쇄적으로 수정되어야 했습니다.

먼저 수정과정을 설명하기 앞서 Jandi 앱의 Network 통신 전제조건에 대해서 설명해드리도록 하겠습니다.

Jandi 앱은 모든 Network 통신은 Current Thread 에서 한다는 것을 전제로 합니다. 이는 MainThread 에서의 통신이 아니라 호출자의 Thread 를 따라간다는 것을 전제로 하고 있습니다.
또한 이를 위해 Reponse 반환, Error Handling, 세션 자동 갱신을 위해 Generic 으로 선언된 Facade 용도의 Wrapper Class 를 별도로 두고 있습니다.

따라서 수정해야할 1,2 번을 위해 아래와 같은 수정을 하였습니다.

1. Facade Class 내에서 성공여부를 직접 파악한다.
2. 성공시 Return Value 를 직접 반환할 수 있도록 한다.
3. 실패시 Status, Response 정보를 이용하여 throw Exception 을 한다. (세션 정보를 갱신 로직은 당연히 포함되어 있습니다.)

그래서 아래와 같은 코드 형태가 되었습니다.

```java
Response<RESULT> response = apiExecutor.execute();
if (response.isSuccessful()) {
    RESULT object = response.body();
    retryCnt = 0;
    return object;
} else {
    // 400 이상 오류에 대해 처리
    return handleException(apiExecutor, response, null);
}
```

Network 통신 과정에서의 Exception 이 나는 경우는 2가지 입니다.

> 1. 기기의 Network 자체가 끊겨 있거나 비정상인 경우
> 2. Response 의 Parsing 과정에서 오류가 발생한 경우

### Annotation 의 변화

Annotation 의 가장 큰 변화는 DELETE 였습니다. 기존의 Retrofit 에서는 DELETE 요청은 GET 방식으로 가능하였습니다. 즉 POST 처럼 Body 를 설정할 수 없게 되어 있었습니다. 따라서 DELETE 를 쓰기 위해서는 별도의 Custom HTTP Annotation 을 설정 할 적용하여야 했습니다.

Retrofit2 에서는 이런 경우에 대비하기 위해 @HTTP 를 개방하였습니다.
`@HTTP(path = "{url}", method = "DELETE", hasBody = true)` 와 같이 사용해야만 Custom HTTP Method 를 적용하실 수 있습니다.

### Jackson2-Converter 대응

Jackson2-Converter 의 이슈는 최근에서야 알게 되었습니다. Jandi 앱은 그동안 Jackson 1.x 를 사용하였고 최근에서야 Jackson2 로 전환을 하였습니다.

그 과정에서 Retrofit2 의 `converter-jackson` 라이브러리를 사용하려 하였으나 중대한 문제가 있었습니다.

Retrofit2 에서 Reqeust Body 의 Serialize 는 메소드의 참조변수로 선언된 클래스만 지원하며 상속한 자녀클래스를 넣어도 부모 클래스의 결과만을 리턴 하는것이었습니다. (gson 과 여타 converter 에 대해는 해당 이슈에 대해 파악해보지 않았습니다).

이를테면 아래와 같은 경우입니다.

```java
interface Api {
  @PUT("/profile")
  Call<Response> modifyProfile(@Body Profile profile);
}

public class Profile {}
public class NameProfile extends Profile{ String name; }
public class PhoneProfile extends Profile{ String phone; }
```

```java
// using case
api.modifyProfile(new NameProfile("Steve"));
```

허나 아래와 같은 상황이 펼쳐집니다.

```json
// expect
{"name":"Steve"}

// actual
{}
```

해당 문제는 Converter-Jackson 의 이슈이기 때문에
위와 같은 상황이 예상된다면 별도의 Converter.Factory 를 선언하여 사용하시기 바랍니다.

### OkHttpClient 생성 이슈

Okhttp 에 여러가지 기능이 추가되었습니다.
그중 잔디가 사용 중인 목록입니다.

1. [okhttp-logging-interceptor](https://github.com/square/okhttp/tree/master/okhttp-logging-interceptor)
2. [authenticator](https://github.com/square/okhttp/wiki/Recipes#handling-authentication)
3. [Cutome SSL](https://github.com/square/okhttp/wiki/HTTPS)

이런 이유 때문에 OkHttpClient 를 직접 생성하여 사용 하고 있습니다.

처음에는 OkHttpClient 를 모든 API 호출시 새로 생성하도록 하였습니다. 헌데 TestCode 가 200회가 넘어가면 File IO 를 너무 많이 사용했다는 오류가 계속적으로 발생하였습니다.

이 오류가 단순히 File IO 가 많아서 라는 메세지 때문에 처음에는 Database 에 대한 오류인 줄 알고 Memory Cache 작업과 테스트코드 개선작업을 하였으나 정상 동작이 되지 않았습니다.
(테스트 코드 1회에 평균 2번의 API 통신과 2회의 DB 처리를 합니다.)

그 와중에 기존의 테스트 코드는 정상 동작하는 것을 보고 Retrofit2 작업을 진행한 branch 만의 문제임을 깨달았습니다.

현재는 OkhttpClient.Builder 를 통해 생성한 1개의 OkhttpClient 만을 재사용하도록 변경하였습니다.

### Network Retry 시 동작 변경

Retrofit2 는 Call 객체를 이용하여 동일한 정보로 재요청을 할 수 있도록 지원하고 있습니다. 하지만 이에 대한 제약이 하나 있습니다. 이미 Network IO 가 끝난 경우 Retrofit2 는 Call 객체를 복사하여 재사용할 것을 가이드 하고 있습니다. 그래서 재요청시 다음과 같이 코드를 작성하셔야 합니다.

```java
Call<RESPONSE> call = action0.call();
if (!call.isExecuted()) {
    return call.execute();
} else {
    return call.clone().execute();
}
```

### OkHttp3 의존성

Okhttp 를 사용하는 타 라이브러리가 있다면 Okhttp3 의존성을 가지고 있기 때문에 이에 유념하셔야 합니다.

## 3. 정리

Retrofit1 -> Retrofit2 로 변경하는 과정에서 다양한 이슈를 발견하였습니다.

1. **Return Value 수정**
2. **Exception 처리 강화**
3. **Annotation 수정**
4. **Request-Response Converter 수정**
5. **OkhttpClient 재사용 정의**
6. **재요청 처리에 대한 validation 추가**
7. **OkHttp3 의존성**

Retrofit2 로 변경에 있어서 가장 큰 핵심은 Call 이라는 객체라고 할 수 있다는 것입니다.

이 객체는 Request 에 대한 동작 제어(cancel, retry 등), Request-Response 의 독립성 보장, 그에 따라 각각의 정보에 대한 접근 등을 보장하게 됩니다.

Retrofit2 는 그외에도 Okhttp3 와 다양한 플러그인 지원하고 있습니다. 요청-응답에 필요한 Body 의 변환툴 (Converter-xxx), EndPoint 에서 접근하는 Call 객체에 대한 다양한 툴 (CallAdapter-xxx) 

현재 Retrofit1 에서 잘 동작하고 있고 의도대로 흐름제어를 하고 있다면 Retrofit2 로 옮겨갈 이유는 없습니다. 하지만 변경을 하고자 한다면 이러한 영향도가 있을 것임을 공유해드렸습니다.

### 참고하면 좋은 Slide

<script async class="speakerdeck-embed" data-id="ba44159d080a4416acb1c62353d98371" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

[Jake Wharton' Retrofit2](https://speakerdeck.com/jakewharton/simple-http-with-retrofit-2-droidcon-nyc-2015)

[Presentation 영상](https://www.youtube.com/watch?v=KIAoQbAu3eA&feature=youtu.be)