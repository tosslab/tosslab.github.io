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
그러나 사람의 욕심은 끝이 없고 그것을 페이스북은 간파한 것인지 많은 개발자들이 디자이너와 기획자의 요구를 웃으면서 받아들일 수 있게 더 편하고 친숙한 사용법을 제시한 라이브러리를 내놓았습니다. 

***Fresco*** : http://fresco.recrack.com

심지어 **한글문서**까지 제공되고 있습니다 ! ~~(이 문서만으로도 Fresco 를 익힐 수 있다는 것은 안 알려줍니다.)~~

지난 1년간 탄식도 했지만 결국은 감탄을 더 많이하고 만족하며 사용하던 이미지 로딩 라이브러리 [Glide(갓)](https://github.com/bumptech/glide).
최근에 이것을 이용해서 예쁜 디자인과 함께 이미지를 요리 할 때 백종원 선생님 만큼의 포스를 못 내는 듯한 느낌이 들었고, 급기야 다른 라이브러리 맛집을 찾아보게 됩니다.

근근히 "[Github Trending](https://github.com/trending?l=java)"에 올라와서 눈독(갤럭시 사용자 아이폰 바라보듯)은 들였지만 저만치 바라보던 Fresco. 과연 어떤 장점이 있는지 Glide 사용성과 비교해보면서 Fresco 의 사용법을 알아보도록 하겠습니다.

시작하기 전에 기본 준비는 해야겠죠?

##### 1. build.gradle dependency 추가

```java
compile 'com.github.bumptech.glide:glide:3.6.1' // Glide
compile 'com.facebook.fresco:fresco:0.8.1' // Fresco (문서에는 0.5.0 이지만 GitHub 최신 릴리즈 버전이 0.8.1 입니다.)
```

##### 2. AndroidManifest.xml 에 uses-permission 추가

```java
<uses-permission android:name="android.permission.INTERNET"/>
```

### 1. 이미지를 로딩하고 ImageView 에 붙이는 방법부터 알아봅시다. 
Glide:

```java
Glide.with(context)
    .load(String | File | Integer(resource id) | byte[])
    .into(imageView);
```

코드 한 두 줄로 네크워크, 로컬 파일, 리소스 등등에서 얻어온 이미지를 쉽게 ImageView에 붙일 수 있습니다.
     
Fresco:
는 먼저 Application class 의 onCreate override 한 후에 `Fresco.initialize(context);` 구문을 추가해주어야 합니다. (`setContentView()` 가 호출되기 이전에 한 번만 호출하라고 명시되어 있네요.)
 
XML 에서는 `ImageView` 대신 Fresco 의 SimpleDraweeView 를 사용합니다.

```java
<!-- <ImageView -->
<com.facebook.drawee.view.SimpleDraweeView
```

다음 다시 이미지를 로딩하는 구문으로 돌아와서

```java
SimpleDraweeView draweeView = (SimpleDraweeView) find...
draweeView.setImageUri(uri);
```

Glide 에 비해 취해야 할 행동들이 조금 아니 많이 많은데 결론적으로 SimpleDraweeView 의 setImageUri 를 호출하면 자동으로 이미지가 불려옵니다.
다만 여기서 Uri 를 만들어줘야 하는 비용이 또 생겼네요.
 
```java
Uri.parse("http:// | Uri.parse("file:// | Uri.parse("asset:// | Uri.parse("res://
혹은
new Uri.Builder()
    .scheme("file") // ContentResolver.SCHEME_FILE 또는 com.facebook.common.util.UriUtil.LOCAL_FILE_SCHEME 로 대체 가능 합니다.
    .path(filePath)
    .build();
```

### 2. 이미지를 로딩 할 때 대기 이미지를 설정해봅시다.
Glide:

```java
Glide.with(context)
    .load(...)
    .placeHolder(Integer(resoure id) | Drawable)
    .into(imageView);
```

다음 Fresco 는 두 개의 방법이 있습니다.

먼저 XML

```java
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
              xmlns:fresco="http://schemas.android.com/apk/res-auto" // xml namespace 를 추가해줍니다.
...
<com.facebook.drawee.view.SimpleDraweeView
    fresco:placeholderImage="@drawable/ic_launcher"
```

다음 Java Code

```java
GenericDraweeHierarchy hierarchy = draweeView.getHierarchy();
hierarchy.setPlaceholderImage(R.drawable.ic_launcher);
draweeView.setHierarchy(hierarchy);

draweeView.setImageURI(uri);
```

#### 2-1. 대기 이미지는 FIT_CENTER 로 스케일하고 보여줄 원본 이미지는 FIT_XY 로 스케일해봅시다.
Glide:
딱히 Glide 만 이용해서 할 수 있는 방법이 마땅치 않습니다.

```java
imageView.setScaleType(ImageView.ScaleType.FIT_CENTER);
Glide.with(getContext())
    .load(url)
    .placeholder(R.drawable.ic_launcher)
    .listener(new RequestListener<String, GlideDrawable>() {
        @Override
        public boolean onException(Exception e, String model, Target<GlideDrawable> target, boolean isFirstResource) {
            return false;
        }

        @Override
        public boolean onResourceReady(GlideDrawable resource, String model, Target<GlideDrawable> target, boolean isFromMemoryCache, boolean isFirstResource) {
            imageView.setScaleType(ImageView.ScaleType.FIT_XY);
            return false;
        }
    })
    .into(imageView);
```

뭔가 억지스러워 보이네요...
다른 방법으로 BitmapTransformation 을 상속받아 구현하는 것 방법이 떠오르네요 

Fresco:

```java
<com.facebook.drawee.view.SimpleDraweeView
    fresco:placeholderImage="@drawable/ic_launcher"
    fresco:placeholderImageScaleType="fitCenter"
    fresco:actualImageScaleType="fitXY"
```

다음 Java Code

```java
GenericDraweeHierarchy hierarchy = draweeView.getHierarchy();
Drawable placeHolder = getContext().getResources().getDrawable(R.drawable.ic_launcer);
hierarchy.setPlaceholderImage(placeHolder, ScalingUtils.ScaleType.FIT_CENTER);
hierarchy.setActualImageScaleType(ScalingUtils.ScaleType.FIT_XY);
draweeView.setHierarchy(hierarchy);

draweeView.setImageURI(uri);
```

여기서 Fresco 의 장점을 만나게됩니다.
내부적으로는 Glide 에서의 처리만큼 비슷한 동작을 하는지, 성능적으로 비슷한지도 꽤 중요하지만
사용성과 가독성 측면, 특히나 XML 에서 정말 가볍게 설정할 수 있는 부분은 너무나도 좋아보입니다.

### 3. 위에서 보듯 Fresco 의 View 적인 요소들을 다룰때의 장점들을 확인해봅시다.
둥근 이미지나 가장자리가 둥근 이미지를 보여줘 봅시다.
Glide : 
BitmapTransformation 을 상속받는 클래스를 만들어서 직접 Bitmap 을 가공하여야 합니다.
이 때 Xfermode, PoterDuffXfermode, Canvas, Paint 등등 굉장히 많은 정보를 학습하여야 하고 케이스 별로 테스트를 해봐야 하는 리소스가 필요하게 됩니다.(개발자로서 당연한 얘기지만)
이 부분을 구글링을 통해 해결하거나 혹은 android support v4 에 추가된 RoundedBitmapDrawable 를 사용하여야 합니다.

```java
Glide.with(getContext())
    .load(url)
    .asBitmap()
    .centerCrop()
    .into(new BitmapImageViewTarget(imageView) {
        @Override
        protected void setResource(Bitmap resource) {
           RoundedBitmapDrawable circularBitmapDrawable =
                   RoundedBitmapDrawableFactory.create(context.getResources(), resource);
           circularBitmapDrawable.setCircular(true);
           imageView.setImageDrawable(circularBitmapDrawable);
        }
    });
```

Fresco 에서는 둥근 이미지 보여주기가 너무나도 쉽습니다.

```java
// XML
fresco:roundAsCircle="true" // 원형 이미지

fresco:roundAsCircle="false"
fresco:roundedCornerRadius="1dp" // 둥근 사각형 이미지

fresco:roundingBorderWidth="2dp"
fresco:roundingBorderColor="@color/border_color" // 가장자리 색상, 사이즈 조

// Java code
GenericDraweeHierarchy hierarchy = draweeView.getHierarchy();
RoundingParams roundingParams = RoundingParams.asCircle(); // 원형 이미지

RoundingParams roundingParams = RoundingParams.fromCornersRadius(2); // 둥근 사각형 이미지
hierarchy.setRoundingParams(roundingParams);
```

물론 내부적으로는 android support v4 에 추가된 RoundedBitmapDrawable 과 유사한 Drawable 을 만들어 사용되고 있지만 그것을 개발자가 신경쓰지 않을 수 있으니 정말 좋은 점이라고 보여집니다. 
*GIF 이미지는 둥글게 보여지지 않습니다.*

이미지의 외적인 부분을 다루는 것은 Fresco 가 아주 쉽게 해내어 줍니다.
웹에서 자주 보곤하던 이미지를 점진적으로 그려나가는 모습도 Fresco 로 해낼 수 있습니다.
ProgressBar, overlay 등등 많은 부분을 취향껏 그려낼 수 있습니다.
http://fresco.recrack.com/docs/using-drawees-xml.html <- 더 많은 부분을 확인 할 수 있습니다.

### 4. Fresco 의 단점같은 특징을 살펴봅시다.
첫번째로 Fresco 의 DraweeView 가 wrap_content 를 지원하지 않기 때문에 요청할 이미지의 사이즈가 절대적으로 필요합니다. 이럴 땐 ImageView 가 그려진 후에 로딩을 시작해서 View 의 크기만큼의 Resource 를 지원해주는 Glide 가 참 좋네요.(Thanks to [Steve](https://github.com/ZeroBrain)) 
물론 디자인 적으로 적어도 이미지인 부분은 절대적인 수치가 필요하다고 개인적으로 생각하지만 GridView 나 몇 몇 레이아웃에서 match_parent 등이 필요한 경우가 많기 때문에 이 부분은 꽤나 신경쓰입니다.
게다가 원본 이미지가 어느 정도의 사이즈인지 판단이 불가능 한 경우도 있기 때문에 웬만한 경우엔 항상 ResizeOption 이 필요합니다.(Canvas 가 그릴 수 있는 최대치가 넘어버리면 "OpenGLRenderer: Bitmap too large to be uploaded into a texture" Exception 을 내기 때문입니다.)
  
```java
ResizeOptions options = new ResizeOptions(20, 20); // Canvas 가 그릴 수 있는 최대 사이즈를 구해서 넘겨줘도 됩니다.

ImageRequest imageRequest = ImageRequestBuilder.newBuilderWithSource(uri)
        .setResizeOptions(options)
        .build();

DraweeController controller = Fresco.newDraweeControllerBuilder()
        .setImageRequest(imageRequest)
        .setOldController(draweeView.getController())
        .build();
        
draweeView.setController(controller);

// 이런 단점을 조금이라도 보완하기 위해서 일정 비율로 크기를 지정해주는 메소드도 만들어 놓았네요.
draweeView.setAspectRatio(1.33f);
```

두번째로 Fresco 에서 제공하는 CustomView 인 DraweeView 를 대부분의 곳에서 써야(만) 합니다. 이미지 Resource 를 동기적으로 받을 수 있는 방법이 없으며, 비동기적인 방식으로 콜백을 통해 받더라도 Fresco 의 주요 개념인 닫을 수 있는 참조, CloseableReference 를 제때 닫아줘야 하기 때문입니다.
많은 앱들은 Custom ImageView(PhotoView 라던지 PhotoView 라든지) 를 많이 사용할텐데 Fresco 의 주요 개념 중 하나인 ImagePipeLine 과 DataSource 를 이용해서 CustomView 에 Resource 를 붙이는 것이 어렵게 느껴질 수 있을 듯 합니다. [이미지 파이프라인](http://fresco.recrack.com/docs/intro-image-pipeline.html) 을 꼼꼼히 살펴보세요 !!

### 끝으로
Glide 와 Fresco. Glide 는 3.6.1 까지 release 되면서 사용하는 개발자들도 많아지고 솔루션 공유도 잘되고 있기 때문에 또 퍼포먼스 측면에서도 믿음직한 모습을 보입니다.
Fresco 는 아직 0.8.1... 그렇지만 개발자의 손을 덜어주는 마법같은 사용성, 직관성, 제한적이긴 하지만 놀라운 퍼포먼스 등이 현재도 마찬가지, 앞으로도 엄청 기대되는 라이브러리 입니다.(Facebook 앱에 사용되고 있다는 사실이 느낌표를 만들어주네요!)
분명한 것은 둘 중에 뭐가 더 낫냐가 아니라 둘 중 어떤게 우리 앱에 맞냐 인 것 같습니다. 위에 나열한 Glide 의 문제점 같지 않은 문제점들에 비슷한 고민을 하고 계시다면 Fresco 로의 이전도 적극 추천합니다!

