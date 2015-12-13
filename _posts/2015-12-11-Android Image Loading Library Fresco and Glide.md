---
layout: post
title: "Android Image Loading Library Fresco"
author: tony
categories: [android]
description: 안드로이드 이미지 로딩 라이브러리 Fresco 소개 및 비교
tags: [android, image, fresco, glide]
fullview: true
---

# 안드로이드 이미지 로딩 라이브러리 Fresco 소개 및 비교

안드로이드에서 보다 빠르고 간결하게 이미지를 보여주기 위해 오픈소스 라이브러리 Picasso, AUIL 등이 등장했고,
Glide 가 나오면서 쉽고 간결하고 빠르게 원하는 이미지를 언제 어디서든 보여 줄 수 있게 되었습니다.
그러나 사람의 욕심은 끝이 없고 그것을 페이스북은 간파하는 것인지 많은 개발자들이 디자이너와 기획자의 요구를 웃으면서 받아들일 수 있게 더 편하고 친숙한 사용법을 제시한 라이브러리를 내놓았습니다. 

***Fresco*** : http://fresco.recrack.com

심지어 **한글문서**까지 제공되고 있습니다 ! ~~(이 문서만으로도 Fresco 를 익힐 수 있다는 것은 안 알려줍니다.)~~

지난 1년간 탄식도 했지만 결국은 감탄을 더 많이하고 만족하며 사용하던 이미지 로딩 라이브러리 Glide(갓).
최근에 이것을 이용해서 예쁜 디자인과 함께 이미지를 요리 할 때 백종원 선생님 만큼의 포스를 못 내는 듯한 느낌이 들었고, 급기야 다른 라이브러리 맛집을 찾아보게 됩니다.

근근히 GitHub 트렌딩 페이지에 올라와서 눈독(갤럭시 사용자 아이폰 바라보듯)은 들였지만 저만치 바라보던 Fresco. 과연 어떤 장점이 있는지 Glide 사용성과 비교해보면서 Fresco 의 사용법을 알아보도록 하겠습니다.

시작하기 전에 기본 준비는 해야겠죠?

1. build.gradle dependency 추가

```
compile 'com.github.bumptech.glide:glide:3.6.1' // Glide
compile 'com.facebook.fresco:fresco:0.8.1' // Fresco (문서에는 0.5.0 이지만 GitHub 최신 릴리즈 버전이 0.8.1 입니다.)
```

2. AndroidManifest.xml 에 uses-permission 추가

```
<uses-permission android:name="android.permission.INTERNET"/>
```

### 1. 이미지를 로딩하고 ImageView 에 붙이는 방법부터 알아봅시다. 
먼저 Glide

```
Glide.with(context)
    .load(String | File | Integer(resource id) | byte[])
    .into(imageView);
```

코드 한 두 줄로 네크워크, 로컬 파일, 리소스 등등에서 얻어온 이미지를 쉽게 ImageView에 붙일 수 있습니다.
     
다음 Fresco
는 먼저 Application class 의 onCreate override 한 후에 `Fresco.initialize(context);` 구문을 추가해주어야 합니다. (`setContentView()` 가 호출되기 이전에 한 번만 호출하라고 명시되어 있네요.)
 
XML 에서는 `ImageView` 대신 Fresco 의 SimpleDraweeView 를 사용합니다.

```
<!-- <ImageView -->
<com.facebook.drawee.view.SimpleDraweeView
```

다음 다시 이미지를 로딩하는 구문으로 돌아와서

```
SimpleDraweeView draweeView = (SimpleDraweeView) find...
draweeView.setImageUri(uri);
```

Glide 에 비해 취해야 할 행동들이 조금 아니 많이 많은데 결론적으로 SimpleDraweeView 의 setImageUri 를 호출하면 자동으로 이미지가 불려옵니다.
다만 여기서 Uri 를 만들어줘야 하는 비용이 또 생겼네요.
 
```
Uri.parse("http:// | Uri.parse("file:// | Uri.parse("asset:// | Uri.parse("res://
혹은
new Uri.Builder()
    .scheme("file") // com.facebook.common.util.UriUtil.LOCAL_FILE_SCHEME 로 대체 가능 합니다.
    .path(filePath)
    .build();
```
