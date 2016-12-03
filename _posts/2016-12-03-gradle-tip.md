---
layout: post
title: "Android Gradle Tips"
author: steve
categories: [android]
description: 토스랩 안드로이드 팀에서 사용하는 그래들 팁을 정리하였습니다.
tags: [gradle, android, dependency]
fullview: true
---

# 안드로이드와 Gradle

Android 가 Gradle 을 이용하기 시작한 것도 3년이 다 되어 갑니다. 이제는 많은 유저가 당연히 Gradle 을 Android 기본 개발 환경으로 사용하고 있습니다.

하지만 기본 설정으로만 Gradle 을 사용하는 사용자들이 많습니다. 게다가 구글에서 Android Gradle Build DSL 을 끊임없이 변경했기 때문에 많은 사용자들이 이를 이해하기도 전에 변경이 되는 경우가 매우 빈번했습니다.

> 1. [Gradle Dependency 분리하기](/android/2016/10/10/dependencies-of-gradle.html)
> 2. [안드로이드 자동화 툴](/android/2016/02/12/Android-and-automation.html)

위 두번의 포스팅을 통해서 TossLab 에서 사용하고 있는 Gradle 에 대해서 소개를 해드렸습니다.

오늘은 Android 팀이 사용하는 Custom 설정들에 대해서 정리하도록 하겠습니다.

## 1. 초기화 값 검증 및 설정하기

개발자들이나 CI 에서 관리해야하는 속성 값에 대해서는 각각 다르게 설정할 필요가 있습니다.

안드로이드 팀은 3개의 추가적인 속성값을 추가하여 사용하고 있습니다.

```bash
# gradle.properties
inhouse_version=2     # 배포/qa 버전의 hofix version 을 관리학 ㅣ위함
report_coverage=false # coverage 측정에 대한 on/off 기능
dev_min_sdk=21        # minSDK 의 개별적인 관리를 위함
```

위의 3개의 값은 존재 하지 않으면 빌드가 되지 않도록 하는 강제사항으로 만들었으나 새로운 개발자가 입사하게 되었을 때 또는 CI 서버에 실수로 기입하지 못하게 되었을 때 Project Import 나 빌드가 아예 되지 않는 현상이 발생하였기에 초기 값을 설정할 수 있도록 하였습니다.

report_coverage 는 `5. Android Gradle DSL` 에서 `buildTypes.debug.testCoverageEnabled` 에서 사용되며 이 값은 설정에 따라서 디버그 과정에서 변수값들이 제대로 노출되지 않게 됩니다. report 가 필요한 CI 서버 용으로 만들어진 값입니다.

```groovy
// valid.gradle

def checkValidProperties() {

    println "Properties Valid Checking.........."

    if (!project.hasProperty("inhouse_version")) {
        println "set up to gradle.propeties --> inhouse_version = 1 (default)"
        project.ext.inhouse_version = 1
    }

    if (!project.hasProperty("report_coverage")) {
        println "set up to gradle.propeties --> report_coverage = false (default)"
        project.ext.report_coverage = false
    }

    if (!project.hasProperty("dev_min_sdk")) {
        println "set up to gradle.propeties --> dev_min_sdk = 19 (default)"
        project.ext.dev_min_sdk = 19
    }

    println "Properties Valid Check OK"

}

checkValidProperties()


// -------------------------------
// build.gradle
apply from: 'valid.gradle'

```

위와 같이 설정한 뒤 `gradle.properties` 에 아무런 값을 설정하지 않고 빌드를 하게 되면 빌드 최초에 다음과 같은 log 를 보실 수 있습니다.

```
================================================================================
Properties Valid Checking..........
set up to gradle.propeties --> inhouse_version = 1 (default)
set up to gradle.propeties --> report_coverage = false (default)
set up to gradle.propeties --> dev_min_sdk = 19 (default)
Properties Valid Check OK
================================================================================
```


## 2. APK Copy 하기

QA 팀 전달 또는 스토어 배포시에 Android Studio 의 기본 기능을 이용하지 않고 Gradle Task 를 사용하여 빌드를 하게 되면 /app/build/outputs/apk 에 있는 패키지를 복사하는 것이 여간 귀찮은 작업이 아닐 수 없습니다.

그래서 Gradle 에서 기본적으로 제공되는 Copy Task 를 이용하여 APK Copy Task 를 만들었습니다.

```groovy
// apk-copy.gradle
android.applicationVariants.all { variant ->

    // 1. Copy Task 생성
    def task = project.tasks.create("copy${variant.name}Apk", Copy)
    task.from(variant.outputs[0].outputFile)

    // 2. 바탕화면 Task 로 복사
    task.into("${System.properties['user.home']}/Desktop/")

    // 3. 복사하는 과정에서 APK 이름 변경
    def targetName = "jandi-${variant.baseName}-${variant.versionName}.apk"
    task.rename ".*", targetName
    task.doFirst {
        println "copy from ${source.singleFile.name} to $destinationDir"
    }

    task.doLast { value ->
        println "completed to copy : $targetName"
    }

}

// ---------------
// build.gradle
apply from: 'apk-copy.gradle'
```

위의 Task 는 총 3개의 단계로 구분할 수 있습니다.

> 1. Copy Task 생성
> 2. ~/Desktop 으로 복사
> 3. 복사 할 때 APK 이름 변경

Task 를 정의하는 과정에서 application 의 flavor, build-type, version 을 기반으로 복사하도록 한 것입니다.

위와 같이 설정하면 다음과 같이 사용할 수 있습니다.

```bash
# flavor : qa , build-type : Debug
$> ./gradlew assembleQaDebug copyqaDebugApk
# 또는 줄여서 아래와 같이 쓸 수 있습니다.
$> ./gradlew aQD copyQDA
```

Application Variant 에 대한 변수는 [링크](http://tools.android.com/tech-docs/new-build-system/user-guide#TOC-Shrinking-Resources)에서 확인하실 수 있습니다.


## 3. CI Tasks

CI 용으로 CheckStyle 과 PMD 를 사용하기 때문에 관련 설정 또한 별도로 처리하였습니다.

```groovy
task pmd(type: Pmd) {

    source 'src/main'
    include '**/*.java'

    ruleSetFiles = files('../pmd.xml')
    ignoreFailures = true

}

task checkstyles(type: Checkstyle) {

    configFile file('../checkstyle.xml')
    source('src/main')
    include '**/*.java'

    classpath = files()

    showViolations = true
    ignoreFailures = true

}

// ---------------
// build.gradle
apply from: 'ci-tasks.gradle'
```

CheckStyle 과 PMD 설정에 필요한 정보 또한 별도의 script 로 설정하였습니다.

## 4. Gradle Properties

빠른 빌드를 위해 추가적인 설정을 하고 있습니다.

```bash
# gradle.properties
# 백그라운드 빌드
org.gradle.daemon=true
# 동시 빌드
org.gradle.parallel=true
# jvm heap size
org.gradle.jvmargs=-Xmx4346m
# build jdk
org.gradle.java.home=/Library/Java/JavaVirtualMachines/jdk1.8.0_101.jdk/Contents/Home
```

위의 설정 중에서 제일 보셔야 할 것이 `org.gradle.jvmargs` 입니다. Android Gradle 설정 중에서 위의 값이 적으면 빌드속도가 현저히 느려집니다.

빌드 할 때 console log 를 확인하시고 값을 적절하게 맞춰주실 것을 권장합니다.

## 5. Android Gradle DSL 추가 정의하기

```groovy

// build.gradle
// ...중략
android {
  // 특정 Flavor에서 Release Build 막기
  android.variantFilter { variant ->
      if (variant.buildType.name.equals('release')
              && (variant.getFlavors().get(0).name.equals('qa')
              || variant.getFlavors().get(0).name.equals('dev'))) {
          variant.setIgnore(true);
      }
  }

  buildTypes {
      debug {
          debuggable true
          testCoverageEnabled = project.hasProperty("report_coverage") && report_coverage.toBoolean()
      }
      // ..중략...
  }
  productFlavors {
      dev {       // demo version
          applicationId 'com.tosslab.jandi.app.dev'
          versionName(defaultConfig.versionName + ".dev." + inhouse_version)
          minSdkVersion project.hasProperty("dev_min_sdk") ? dev_min_sdk : 19
      }
      // ..중략..
  }

  // 빌드 과정에서 CPU 와 Ram 최적화 하기
  dexOptions {
      javaMaxHeapSize "2g"
      maxProcessCount Math.max(1, ((int) (Runtime.getRuntime().availableProcessors() / 2)))
  }
}
```

* variant-filter 를 이용해서 qa 나 dev 용 빌드는 release 버전이 빌드되지 않도록 하였습니다.

* buildTypes 와 productFlavors 에서는 앞서 설정한 gradle-properties 에 대해서 설정에 따라 기본값이 지정되도록 하였습니다.

* `dexOptions` 설정은 개발하는 기기의 PC 환경에 따라 다를 수 있습니다.

Android DSL 에 의하면 Dex 빌드 과정에서 최종적으로 사용하는 메모리는 `heapsize * process-count` 라고 합니다.

> 1. heapsize 기본값 : 2048MB
> 2. process-count 기본값 : 4
> 3. [참고문서](http://google.github.io/android-gradle-dsl/current/com.android.build.gradle.internal.dsl.DexOptions.html#com.android.build.gradle.internal.dsl.DexOptions:maxProcessCount)


## 6. Android Resource Image 의 EXIF 정보 삭제하기

보통 디자이너가 Photoshop 과 같은 툴을 이용하여 이미지를 만들게 되면 자동으로 adobe 와 관련된 exif 정보가 붙게 됩니다. 그래서 빌드 할 때 `libpng warning : iCCP ...` 와 같은 warning 메세지를 보실 수 있습니다. 이는 Android Build 과정에서 `aapt` 가 이미지 최적화 하는 과정에서 불필요한 exif 정보로 인해서 오류를 내게 됩니다.

따라서 exif 정보를 초기화 해주는 작업이 필요합니다.

> 맥 사용자에 한해서 지원됩니다.

HomeBrew 를 이용해서 exiftool 을 설치하셔야 합니다. [exiftool 설명](http://brewformulas.org/Exiftool)

```bash
find . -path '*src/main/res/*' -name '*.png' -exec exiftool -overwrite_original -all= {} \;
```

저는 별도로 쉘 스크립트를 만들어서 실행합니다.

아래를 복사해서 붙여넣기로 실행하시면 됩니다.

```bash
echo "find . -path '*src/main/res/*' -name '*.png' -exec exiftool -overwrite_original -all= {} \;" > exif_clean.sh
chmod 744 exif_clean.sh
```

관련 정보 : [adt-dev google group 에서 제시된 해결책](https://groups.google.com/forum/#!msg/adt-dev/rjTQ_STR3OE/-UcNQRISTKsJ)

# Wrap up

안드로이드 팀은 Gradle 을 이용하여 반복적일 수 있는 작업을 자동화 하고 다양한 초기화 설정과 편의를 가지고자 하였습니다.

1. 초기화 값 검증 및 설정
2. Apk 복사 자동화
3. CI Task 정의
4. Gradle Properties 지정
5. Android Gradle DSL 정의
6. Android Resource Image EXIF 삭제

Gradle 을 얼마나 잘 활용하냐에 따라서 조직에 필요한 Task 를 금방 만드실 수 있습니다. 이번 포스팅이 도움이 되었기를 바라며 활용해보실 것을 권장합니다.
