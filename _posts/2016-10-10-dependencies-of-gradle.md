---
layout: post
title: "Gradle Dependency 분리하기"
author: steve
categories: [android]
description: Gradle 의 의존성 처리 부분을 좀 더 나눠서 관리하는 방법입니다.
tags: [gradle, android, dependency]
published: false
fullview: true
---


> 본 포스팅은 아래 코드를 보시면 좀 더 이해하기 쉽습니다.

> 1. [build.gradle](https://github.com/ZeroBrain/DataBind-MVVM-Sample/blob/master/build.gradle)
> 2. [dependencies-variable.gradle](https://github.com/ZeroBrain/DataBind-MVVM-Sample/blob/master/dependencies-variable.gradle)
> 3. [dependencies-classpath.gradle](https://github.com/ZeroBrain/DataBind-MVVM-Sample/blob/master/dependencies-classpath.gradle)
> 4. [dependencies-app.gradle](https://github.com/ZeroBrain/DataBind-MVVM-Sample/blob/master/dependencies-app.gradle)

# Gradle 의 역할

Gradle 은 이제 안드로이드 개발에 있어서 그 중심이 되는 빌드 환경입니다.
안드로이드 빌드에 대한 기본 설정 뿐만 아니라 빌드에 필요한 Task 를 지정하거나 의존성을 추가할 수 있습니다.

특히 의존성에서 일반적인 서비스들은 다양한 오픈소스를 활용하게 됩니다.
네트워크 라이브러리, 이미지 라이브러리, DI 라이브러리, Support 라이브러리,Play-Service 라이브러리 등등 이젠 프로젝트를 시작함에 있어서 기본적으로 10개 이상의 라이브러리를 추가하게 됩니다.
이러한 라이브러리들이 많아질수록 필연적으로 빌드 스크립트가 길어지게 됩니다. 이는 나중에 빌드에 관련된 코드를 추가/수정할 때 유지보수에 영향을 끼치게 됩니다.

# Gradle 의존성 분리하기

토스랩에서는 꽤 많은 숫자의 라이브러릴 사용하고 있습니다. 테스트용 라이브러리들까지 포함해서 60여개의 라이브러리를 쓰고 있습니다.
이러한 라이브러리 코드들이 1개의 빌드 스크립트 안에 포함되어 진다면 라이브러리의 버전을 변경하거나 수정하는 작업을 할 때에는 불가피하게 시간이 소요될 수 밖에 없습니다.

그에 따라 Gradle 에서 라이브러리들을 변수화 해서 분리하는 작업을 하였습니다.

## 1. 라이브러리 변수화 하기

```groovy
ext {
  retrofit = 'com.squareup.retrofit2:retrofit:2.1.0'
  retrofit2_gson      = 'com.squareup.retrofit2:converter-gson:2.1.0'
  retrofit2_rxjava2   = 'com.jakewharton.retrofit:retrofit2-rxjava2-adapter:2.1.0'
}
```

가장 간단한 변수화였습니다. 하지만 Retrofit 은 관련 라이브러리들이 함께 수반되기 때문에 버전명을 다시 분리하였습니다.

## 2. 라이브러리 버전 변수화 하기

```groovy
ext {
  retrofit_version = '2.1.0'
  retrofit = "com.squareup.retrofit2:retrofit:$retrofit_version"
  retrofit2_gson      = "com.squareup.retrofit2:converter-gson:$retrofit_version"
  retrofit2_rxjava2   = "com.jakewharton.retrofit:retrofit2-rxjava2-adapter:$retrofit_version"
}
```

하지만 버전명과 라이브러리이름이 함께 있는 것이 깔끔해보이진 않습니다. 그래서 아래와 같이 바꿨습니다.

## 3. 라이브러리 이름과 버전의 분리

```groovy
ext {
  retrofit = '2.1.0'
}

ext.dependencies = [
  retrofit2           : "com.squareup.retrofit2:retrofit:$ext.retrofit",
  retrofit2_gson      : "com.squareup.retrofit2:converter-gson:$ext.retrofit",
  retrofit2_rxjava2   : "com.jakewharton.retrofit:retrofit2-rxjava2-adapter:$ext.retrofit_rxjava2",
]
```

실제에는 다음과 같이 사용하면 됩니다.

```groovy
dependencies {
  compile rootProject.ext.dependencies.retrofit2
  compile rootProject.ext.dependencies.retrofit2_gson
  compile rootProject.ext.dependencies.retrofit2_rxjava2              
}
```

이제 라이브러리를 변수화 해서 분리를 하였습니다.

이제 변수로 지정한 라이브러리들은 `build.gradle` 파일안에 존재하게 됩니다.


```groovy
// build.gradle
ext {
  retrofit = '2.1.0'
}

ext.dependencies = [
  retrofit2           : "com.squareup.retrofit2:retrofit:$ext.retrofit",
  retrofit2_gson      : "com.squareup.retrofit2:converter-gson:$ext.retrofit",
  retrofit2_rxjava2   : "com.jakewharton.retrofit:retrofit2-rxjava2-adapter:$ext.retrofit_rxjava2",
]

buildscript {
  // blah blah
}
```

라이브러리가 3개뿐이니 깔끔해보이는군요. 하지만 토스랩의 라이브러리는 60여개 입니다. 변수명도 60여개라는 말이죠.
그래서 라이브러리 변수들만 파일을 분리하기로 했습니다.

## 4. 라이브러리 변수를 파일로 분리하기

```groovy
// dependencies-variable.gradle
ext {
  retrofit = '2.1.0'
}

ext.dependencies = [
  retrofit2           : "com.squareup.retrofit2:retrofit:$ext.retrofit",
  retrofit2_gson      : "com.squareup.retrofit2:converter-gson:$ext.retrofit",
  retrofit2_rxjava2   : "com.jakewharton.retrofit:retrofit2-rxjava2-adapter:$ext.retrofit_rxjava2",
]
```


```groovy
// build.gradle
apply from :'dependencies-variable.gradle'

buildscript {
  // blah blah
}
```

이제 좀 교통정리가 되어가는 기분이네요.

하지만 app 의 build.gradle 을 보았습니다.


```groovy
// app 의 build.gradle
apply plugin: 'com.android.application'

dependencies {
  // 라이브러리 60개
  compile rootProject.ext.dependencies.library.retrofit2
  compile rootProject.ext.dependencies.library.retrofit2_gson
  compile rootProject.ext.dependencies.library.retrofit2_rxjava2
}

android {
  // 중략
}
```

뭔가 잘못되어 가고 있습니다. 여전히 dependencies 가 큰 부분을 차지하고 있습니다.

## 5. app.dependencies 분리하기

이제 dependencies 를 분리할 차례입니다.

```groovy
// dependencies-app.gradle
repositories {
    jcenter()
}
dependencies {
    compile fileTree(dir: 'libs', include: ['*.jar'])

    compile rootProject.ext.dependencies.library.retrofit2
    compile rootProject.ext.dependencies.library.retrofit2_gson
    compile rootProject.ext.dependencies.library.retrofit2_rxjava2
    compile rootProject.ext.dependencies.library.okhttp3
    compile rootProject.ext.dependencies.library.okhttp3_logging
    compile rootProject.ext.dependencies.library.stetho_okhttp3
}
```

```groovy
// app 의 build.gradle
apply from: 'dependencies-app.gradle'
```

이제 dependencies 와 관련된 스크립트가 분리되었습니다.

하지만 저 apply from 이 항상 app 의 build.gradle 에 따라 붙어야 하는 것이 아쉽습니다.
그래서 buildscript 에 아예 추가하기로 하엿습니다.

## 6. 빌드 스크립트에 dependencies 추가 동작하기

먼저 빌드 스크립트용 스크립트를 만들겠습니다.

```groovy
// dependencies-classpath.gradle
rootProject.buildscript.repositories {
    jcenter()
}
rootProject.buildscript.dependencies {
    classpath rootProject.ext.dependencies.classpath.android  
}
```

그리고 buildscript 가 시작될 때 모든 dependencies 스크립트가 인식할 수 있게 하겠습니다.
인식할 스크립트는 다음과 같습니다.

> 1. dependencies-variable.gradle - 라이브러리 변수 저장
> 2. dependencies-classpath.gradle - 빌드용 스크립트 저장
> 3. dependencies-app.gradle - 라이브러리 추가 스크립트 저장

rootProject 의 build.gradle 를 아래와 같이 변경합니다.

```groovy
// rootProject 의 build.gradle
buildscript {
    apply from: "dependencies-variable.gradle"
    apply from: "dependencies-classpath.gradle"
}
apply from: 'dependencies-app.gradle'
```

위와 같이 변경을 하면 빌드스크립트가 동작하는 시점에 변수를 인식하고 빌드용 스크립트를 인식합니다.

하지만 앱용 라이브러리 추가 스크립트는 아직 준비가 덜 되었습니다.
"app" 프로젝트가 인식이 된 시점에 라이브러리가 추가되어야 하기때문에 처음 만들었던 스크립트로는 한계가 있습니다.

그래서 아래와 같이 변경하겠습니다.

```groovy
// dependencies-app.gradle
rootProject.allprojects { project ->
  if (project.name == 'app') {

    project.afterEvaluate {
      repositories {
          jcenter()
      }

      dependencies {

        compile fileTree(dir: 'libs', include: ['*.jar'])

        compile rootProject.ext.dependencies.library.retrofit2
        compile rootProject.ext.dependencies.library.retrofit2_gson
        compile rootProject.ext.dependencies.library.retrofit2_rxjava2

      }
    }
  }
}
```

*afterEvaluate* 는 프로젝트의 인식이 완료되면 동작이 되는 함수이기 때문에 모든 것이 끝나고 dependencies 가 추가되는 것으로 이해하시면 됩니다.

# 정리

위의 과정을 거침으로써 gradle 파일은 좀 더 나뉘었지만 app 의 build.gradle 은 안드로이드 프로젝트 그 자체에 집중 할 수 있도록 하였습니다.

이렇게 나누었던 본래의 목적은 의존성 라이브러리와 코드 품질 관리용 스크립트가 1개의 스크립트 파일에 담겨지면서 관리하는 데 있어서 큰 문제가 발생하게 되었습니다.
그에 따라 각각을 나누고 그 목적에 맞도록 각가의 파일 만들었습니다.

> 1. 라이브러리의 변수용 파일
> 2. buildscript 용 classpath 를 관리하는 파일
> 3. 본 프로젝트의 라이브러리 의존성 관리 파일



## 참고 소스

> Github : [https://github.com/ZeroBrain/DataBind-MVVM-Sample](https://github.com/ZeroBrain/DataBind-MVVM-Sample)
