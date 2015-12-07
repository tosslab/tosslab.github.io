---
layout: post
title: "더 빠른 Android App Build"
author: steve
categories: [android]
description: 안드로이드 앱 빌드 속도를 올리기 위한 처절함...
tags: [android, gradle, buck, bazel, performance]
fullview: true
---

# Android App Build의 변화
----
Android App 개발에서 빌드는 올해 중순을 기점으로 큰 변화를 가져왔습니다.

Ant 에서 Gradle 로...
Eclipse 에서 Android Studio 로...

Android Studio 는 JetBrains 사의 IntelliJ 의 Community 버전을 커스터마이징한 것입니다.

Gradle 은  Ant 의 빌드 기능 에 Maven 의 의존성 관리 기능이 접목된 빌드 툴입니다. 그만큼 제공하는 기능이 다양하며 동시에 의존성에 대한 문제도 함께 해결이 되었습니다.

큰 변화는 장점과 단점 모두를 가져왔습니다. 대표적인 장점은 기존에 Eclipse 에서는 한계가 있었던 Plugin 기능이 더욱더 다양해졌다는 것입니다. 반면 갑작스럽게 바뀐 IDE 와 빌드툴은 여전히 큰 장벽으로 존재하고 있습니다.

특히 Gradle 의 성능 문제는 줄곧 거론되었습니다. Eclipse 에서는 빠르게 빌드되던 것이 Gradle 기반으로 전환되면서 적게는 2배에서 5배 이상 오래 소요되는 문제를 가져오게 되었습니다.

그러한 문제는 토스랩의 안드로이드 팀도 빗겨갈순 없었습니다.

코딩-빌드-실행이라는 반복적인 패턴에서 빌드에 소요되는 시간이 개발의 흐름을 끊게 되는 상황에서 이를 개선하는 것은 필수적인 요소였습니다.

이 포스팅은 그동안 잔디의 안드로이드 팀이 빌드 속도를 개선하기 위해 노력했던 흔적들의 모음입니다.

# New Android App Build System
----
### 1. [Bazel](http://bazel.io/) (Google)
본디 Android 만을 위한 빌드는 아니고 iOS 까지 빌드 할 수 있는 **통합 빌드 시스템**이라고 보시면 됩니다. Google 의 빌드 시스템인 Blaze 에서 파생된 빌드 프로젝트로 현재 베타로 등록, 진행되고 있습니다.

### 2. [Buck](https://buckbuild.com/) (Facebook)
Bazel 보다는 좀 더 **다양한 언어를 지원**하기 위한 프로젝트로 보여집니다. 실제로 Go, Rust 등 다양한 언어를 지원하는 빌드 툴이라고 생각하시면 됩니다.


### 3. [Pants](https://pantsbuild.github.io/) (Twitter, FourSquare, Square)
3개의 회사가 협동해서 만든 빌드 툴입니다.

* 특이점은 Bazel 만 Mobile Platform 을 위해 개량된 빌드 툴이고 2개는 좀 더 다양한 빌드 환경을 제공한다는 것입니다.

# Build 시스템의 성능들
----
### 1. Bazel
![Bazel Performance](http://bazel.io/assets/mobile-install-performance.svg)|
----|
출처 : _**Bazel** (http://bazel.io/docs/mobile-install.html)_|

구글의 자료에 의하면 기존에 비해 **4배~10배 의 성능 향상**이 있다고 합니다.

### 2. Buck

    |**Gradle**|**Buck**|  |
----|----|----|----|
clean build|31s|6s|5x|
incremental build|13s|1.7s|7.5x|
no-op build|3s|0.2s|15x|
clean install|7.2s|7.2s|1x|
incremental install|7.2s|1.5s|4.8x|

출처: _**Buck** (https://buckbuild.com/article/exopackage.html)_

# Gradle 과 비교
Gradle 팀에서는 Bazel 에 대해서 2015년 3월 포스팅에 아래와 같이 평하였습니다.

### Gradle 팀이 꼽은 Bazel 의 단점
> 1. Bazel 은 구글의 특화 되어 있으며 쉽게 빌드 할 수 있을만큼 고수준 상태가 아니다
> 2. 확장성이 떨어진다.
> 3. 성능은 의존성이 해결된 이후의 문제이다.
> 4. *nix 환경(Mac, 유닉스, 리눅스를 지칭)에서만 가능하다. 아직 많은 엔터프라이즈 툴들이 .Net 기반이다.(51%)
> 5. 플러그인을 위한 생태계가 구성되어 있지 않다.

# 결론
각각의 빌드 시스템들이 제공해주는 정보에 따르면 새로운 빌드 시스템은 큰 차이를 보여주는 빌드 환경을 제공해줍니다.
하지만 그런 이점에도 불구하고 잘 알려지지 않은 이유는 설정에 큰 어려움이 있기 때문입니다. Gradle 과 Android Plugin 에서 제공해주던 것을 직접 스크립트로 작성을 해야하며 각각의 의존성에 대해서도 직접적으로 명시를 해줘야 하기 때문에 정교하고 어려운 작업입니다. 또한 개별적으로 Plugin 을 제공하지 않아 Crash Report 를 위한 툴이나 Build 과정에서 추가적인 작업들이 필요한 경우에도 별도의 작업을 필요로 합니다.

이러한 어려움에 기존의 Gradle 에서 새로운 빌드 환경으로의 전환은 쉽지 않으며 끊임없는 도전이 될 것입니다.

그래서 잔디의 안드로이드 팀이 선택한 것은 **Gradle 에서 성능 극대화 하기** 입니다.

# Gradle 의 성능 개선하기

### 1. Gradle 의 최신화 
{% highlight java %}
$> vi $project/gradle/wrapper/gradle-wrapper.properties

distributionUrl=https\://services.gradle.org/distributions/gradle-2.9-all.zip
{% endhighlight %}

### 2. Android Gradle Plugin 최신화
{% highlight java %}
buildscrpt {
  dependencies {
    classpath 'com.android.tools.build:gradle:1.5.0'
  }
}
{% endhighlight %}

### 3. 최소 지원 기기 설정하기
{% highlight java %}
android {
  productFlavors {
    dev {
        minSdkVersion 21
    }
    prod {
        minSdkVersion 14
    }
  }
}
{% endhighlight %}

minSdkVersion 을 LOLLIPOP 으로 설정하게 되면 Build 하는 과정에서 큰 부분이 생략이 되고 특히 MultiDex 를 설정한 프로젝트에서 더 큰 효과를 보실 수 있습니다.
Android 는 컴파일 및 패키징과정에서 Class to Dex 와 Merge Dex 을 거치게 됩니다. 이때 하지만 LOLLIPOP 부터는 art 기반이기때문에 Merge Dex 과정이 생략되기에 빌드 성능이 크게 개선됩니다.
단, API 21을 바라보기때문에 lint 나 개발 과정에서 API 특화 대응이 되질 않을 수 있습니다. 유의해서 API 를 사용해주세요.

### 4. Gradle 속성 추가

{% highlight java %}
$> vi $project/gradle.properties

org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.jvmargs=-Xmx768m
{% endhighlight %}

### 5. DexOption 추가
{% highlight java %}
android {
  dexOptions {
    incremental true
  }
}
{% endhighlight %}
※incremental 은 잠재적 오류가 있을 수 있으니 조심해서 사용하라고 합니다. [(참고링크)](http://google.github.io/android-gradle-dsl/current/com.android.build.gradle.internal.dsl.DexOptions.html#com.android.build.gradle.internal.dsl.DexOptions:incremental)

# 빌드 성능 비교
**빌드 환경** : MacBook Pro Retina 2012 (i7 2.3Ghz, 8GB Ram)

    |**변경 전**|**변경 후**|  |
----|----|----|----|
SingleDex clean build|57s|47s|1.2x|
SingleDex incremental build|16.3s|9.6s|1.7x|
MultiDex clean build|71s|71s|1x|
MultiDex incremental build|48s|17.6s|2.7x|

**Incremental Build 를 보면 Single Dex, Multi Dex 모두에서 주목할만큼 성능 향상**이 있습니다. 개발 과정에서는 Incremental Build 가 대다수의 빌드임을 감안한다면 Gradle 옵션을 수정이 개발 과정에서도 충분히 좋은 성능을 얻을 수 있음을 알 수 있습니다.

코딩-빌드-실행을 반복해야하는 패턴에서 최대한 코딩과 테스트에 집중할 수 있는 환경을 만들기 위해 했던 많은 시도들이 다른 안드로이드 개발자분들에게 큰 도움이 되었으면 합니다.