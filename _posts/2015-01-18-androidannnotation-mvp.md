---
layout: post
title: "AndroidAnnotation 과 MVP 패턴"
author: steve
tags: [androidannotation, mvp, pattern]
fullview: true
---

## Android 개발 코드의 구조화

### 초창기 안드로이드 개발 코드의 모습


{% highlight java %}
public class MainAcivity extends Activity {

@Override
public void onCreate(Bundle saveInstance) {
   super.onCreate(saveInstance);
   setContent(R.layout.main);

   TextView textView = (TextView) findViewById(R.id.btn_confirm);
   textView.setText("Non-Clicked");


   findViewById(R.id.btn_confirm).setOnClickListener(new View.OnClickListener() {

       @Override
       public void onClick(View view) {
           TextView textView = (TextView) findViewById(R.id.btn_confirm);
           textView.setText(getClickedText());
       }
   });
}

String getClickedText() {
   return "Clicked!!!";
}

}
{% endhighlight %}

위의 코드는 일반적으로 처음 안드로이드를 접하는 사람들이 쓰는 코드들입니다.
Activity 내에 이벤트를 핸들링하는 처리나 뷰에 접근하는 코드들이 모두 있습니다.

이러한 코드들의 모습은 서버기반 동작시엔 하나의 Activity 내에 네트워크 처리를 위한 쓰레드 처리까지 하게되는 등 코드가 커지면 커질수록 가독성도 떨어지며 유지보수가 힘들어지는 코드로 가기 쉬워집니다.

그래서 기존의 웹에서처럼 좀 더 기능별로 분할하여 코드들을 간결하고 유지보수가 쉬워지도록 하기 위한 방법들이 많이 도입되기 시작하였습니다.

### 나은 코드들을 위한 패턴들

* MVC


{% highlight java %}
public class MainAcivity extends Activity {
	private MainModel mainModel;

	@Override
	public void onCreate(Bundle saveInstance) {
		super.onCreate(saveInstance);
		setContent(R.layout.main);
		
		mainModel = new MainModel();
		
		TextView textView = (TextView) findViewById(R.id.btn_confirm);
		textView.setText("Non-Clicked");
		
		
		findViewById(R.id.btn_confirm)
			.setOnClickListener(new View.OnClickListener(){
			
				@Override
				public void onClick(View view) {
					String text = mainModel.getClickedText();
					TextView textView = (TextView) findViewById(R.id.btn_confirm);
					textView.setText();
				}
			});
	}
}
{% endhighlight %}

{% highlight java %}
public class MainModel {

	public String getClickedText() {
		return "Clicked!!!";
	}

}
{% endhighlight %}

로직은 Model 로 분리를 하였기 때문에 Activity 는 View 와 Click Event 를 처리하는 모습으로 변화되었습니다.

하지만 Click Event 와 View 에 대한 처리가 함께 있는 것을 유심히 생각해볼 필요가 있습니다.
MVC 모델에서 Controller 는 View 에 대한 처리를 직접 하는 것이 아니라 View 에 대한 정보만을 View 에 전달함으로써 화면을 그리는 View 와 동작을 처리하는 로직을 분리하고자 하는데서 시작되었습니다.

헌데 Controller 의 역할을 수행하는 Activity 에서 View 에 대한 직접적인 조작을 수행하는 것은 MVC 모델에 어긋나는 모습을 보여주게 됩니다.

이는 Android 에서 Activity(Fragment) 가 View 와 Controller 두가지의 특성을 모두 가지고 있기 때문에 View 나 Controller 를 한쪽으로 빼게 될 경우 View 에 대한 바인딩이나 처리에서 중복 코드나 일관성을 잃어버리는 코드를 작성할 수 있기 때문입니다.
이를 개선하기 위해서 MVVM 이란 패턴을 적용해봤습니다.

* MVVM

{% highlight java %}
public class MainAcivity extends Activity {

	private MainViewModel mainViewModel;

	@Override
	public void onCreate(Bundle saveInstance) {
		super.onCreate(saveInstance);
		setContent(R.layout.main);
		
		mainViewModel = new MainViewModel(MainActivity.this);
		
	}

}
{% endhighlight %}

{% highlight java %}
public class MainModel {

	public String getClickedText() {
		return "Clicked!!!";
	}

}
{% endhighlight %}

{% highlight java %}
public class MainViewModel {

	private Activity activity;
	private MainModel mainModel;
	private TextView textView;
	
	public MainViewModel(Activity activity) {
		this.activity = activity;
		this.mainModel = new MainModel();
		initView(activity);
	}

	private void initView(Activity activity) {
	
		textView = (TextView) activity.findViewById(R.id.btn_confirm);
		textView.setText("Non-Clicked");
	
		activity.findViewById(R.id.btn_confirm)
			.setOnClickListener(new View.OnClickListener(){
			
				@Override
				public void onClick(View view) {
					String text = mainModel.getClickedText();
					textView.setText(text);
				}
			});
	}
	
}
{% endhighlight %}

ViewModel 로 View 에 대한 처리가 분리되었음을 볼 수 있습니다.

하지만 안드로이드에서 MVVM이 가지는 문제점은 View 에 대한 처리가 복잡해질수록 ViewModel 에 거대해지게 되고 상대적으로 Activity 는 아무런 역할도 하지 않는 형태의 클래스로 변모하게 됩니다.

Controller 의 성격을 지닌 Activity 가 실질적으로 아무런 역할을 하지 못하고 ViewModel 에 치중된 모습을 보여줌으로써 다른 형태의 Activity 클래스를 구현한 꼴이 되어버리는 것입니다.

* MVP


{% highlight java %}
public class MainAcivity extends Activity {

	private MainPresenter mainPresenter;
	private MainModel mainModel;

	@Override
	public void onCreate(Bundle saveInstance) {
		super.onCreate(saveInstance);
		setContent(R.layout.main);
		
		mainModel = new MainModel();
		mainPresenter = new MainPresenter(MainActivity.this);
		
		mainPresenter.setCallback(new Callback(){
			public void onConfirm() {
				String text = mainModel.getClickedText();
				mainPresenter.setText(text);
			}
		});
		
	}

}
{% endhighlight %}

{% highlight java %}
public class MainModel {

	public String getClickedText() {
		return "Clicked!!!";
	}

}
{% endhighlight %}

{% highlight java %}
public class MainPresenter {

    private Activity activity;
    private TextView textView;
    private Callback callback;

    public MainViewModel(Activity activity) {
        this.activity = activity;
        this.mainModel = new MainModel();
        initView(activity);
    }

    public void setCallback(Callback callback) {
        this.callback = callback;
    }

    private void initView(Activity activity) {

        textView = (TextView) activity.findViewById(R.id.btn_confirm);
        textView.setText("Non-Clicked");

        activity.findViewById(R.id.btn_confirm).setOnClickListener(new View.OnClickListener() {

            @Override
            public void onClick(View view) {
                if (callback != null) {
                    callback.onConfirm();
                }
            }
        });
    }

    public void setText(String text) {
        textView.setText(text);
    }

    public interface Callback {
        void onConfirm();
    }

}
{% endhighlight %}

Activity 는 View 에서 받는 콜백만 처리하고 필요한 데이터는 Model 을 통해서 구성하여 실질적인 View 처리는 Presenter 에 넘깁니다. 하지만 Custom 콜백을 받아야만 View 의 이벤트에 대한 처리를 할 수 있다는 단점이 있습니다.

### 정리

| |
|:-----:|
|![Summary Image](./assets/media/post_images/mvc-mvp-mvvm.png)|
|[https://tomyrhymond.wordpress.com/2011/09/16/mvc-mvp-and-mvvm/](https://tomyrhymond.wordpress.com/2011/09/16/mvc-mvp-and-mvvm/)|

* MVC

외부의 모든 이벤트를 Controller(Activity) 에서 처리하되
View 에 관여는 하지 않는 것이 원칙입니다.
하지만 Activity 의 특성상 View 관여하지 않을 수 없습니다. 결국 Android 에서는 MVC 의 구조를 계속적으로 유지하기에는 무리가 있습니다.

* MVVM

ViewModel 이 뷰와의 상호작용 및 제어에 집중합니다. 
ViewModel 에서 직접 뷰의 이벤트를 처리하기 때문에 Controller 의 역할도 함께 수행하게 되어 점점 코드가 집중 되는 구조가 될 수 있습니다. 또한 초기화와 외부 이벤트(뷰에 의한 것이 아닌 이벤트)를 제외 하고는 Activity 의 역할이 모호해지게 됩니다.

* MVP

Presenter 는 뷰의 제어만 담당하고 View 의 이벤트는 ViewController(Activity) 로 전달합니다.
따라서 Activity 는 초기화 와 이벤트를 처리하고 로직과 뷰의 직접 접근을 최소화 하면서 Model-Presenter 간의 상호작용을 제어합니다.

## Annotation

### Annotation 이란?

> 사전적 의미 : 주석

* 특정 클래스, 변수,메소드 등에 붙이는 코드로 해당 타겟의 기능을 좀 더 명확하게 해주는 역할을 합니다. Web Spring 프레임워크 등에서는 타겟의 기능을 정의하여 특정 역할을 수행할 수 있도록 사용되고 있습니다.

### Java Annotation 접근

* Replection 을 이용한 동작

{% highlight java %}
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ResourceView {

    int id() default 0;

}
{% endhighlight %}

{% highlight java %}
public class InjectController {
    public static void injectLayout(Activity mActivity) {

        Annotation[] annotations;
        AbstractInjectCommand command;

        ResourceLayout mLayoutAnnotation = mActivity.getClass().getAnnotation(ResourceLayout.class);

        command = InjectFactory.createInjectCommand(mActivity, mLayoutAnnotation);
        if (command != null) {
            command.excute(null);
        }

        // 어노테이션이 선언된 타겟에 접근하기 위해 클래스 변수에 접근
        Field[] fields = mActivity.getClass().getDeclaredFields();

        int fieldSize = fields.length;
        int annoSize;
        Field field;


        for (int fieldIdx = 0; fieldIdx < fieldSize; ++fieldIdx) {
            field = fields[fieldIdx];

            // private 변수에 접근하기 위함
            field.setAccessible(true);

            // 어노테이션 접근
            annotations = field.getDeclaredAnnotations();

            annoSize = annotations.length;

            for (int annoIdx = 0; annoIdx < annoSize; ++annoIdx) {
                // 어노테이션별 동작 수행
                command = InjectFactory.createInjectCommand(mActivity, annotations[annoIdx]);
                if (command != null) {
                    command.excute(field);
                }
            }
        }

    }
}

{% endhighlight %}

Annotation 이 정의된 타겟을 Java Reflection 을 이용해서 접근한 뒤 Annotation 정보를 추출 후 Annotation 에 맞게 동작을 합니다.
위의 소스는 View 를 Binding 하는 과정 중 일부입니다.

<br />

* Annotation Processing Tool(APT) 에 의한 동작

APT 는 컴파일 시점에 Java 코드 내의 Annotation 을 감지해서 Annotation 이 설정되어 있는 코드들은 새로운 Java 코드를 생성한 뒤 컴파일하도록 합니다.

<br />

* Replection? APT?

Replection 을 활용한 방법은 APT 에 대한 학습에 비하면 다소 쉬운면이 있습니다. 하지만 Runtime 시에 annotation 분석을 하기 때문에 성능상 아쉬운 모습을 볼 수 있습니다. 반면 APT 를 활용한 방식은 컴파일시 시간적인 비용과 APT 를 통해 생성된 코드는 A.java -> A_.java 와 같은 형태로 변한다는 단점이 있으나 Runtime 시 성능상 이점이 있습니다.

### Android-Annotation 의 동작

* 코드 구현



{% highlight groovy %}
buildscript {
    repositories {
        mavenCentral()
    }
    dependencies {
        classpath 'com.neenbedankt.gradle.plugins:android-apt:1.4'
    }
}

apply plugin: 'android-apt'     // Android-Test

configurations {
    apt
}

dependencies {
	compile 'org.androidannotations:androidannotations-api:3.2'
}

apt {
    arguments {
        resourcePackageName android.defaultConfig.applicationId
        androidManifestFile variant.outputs[0].processResources.manifestFile
    }
}
{% endhighlight %}


{% highlight java %}
@EActivity(R.layout.activity_main)
public class MainActivity extends Activity {

	 @ViewById(R.id.tv_main)
    TextView mainTextView;
    
	 @ViewById(R.id.btn_main)
    Button mainButton;
    
    @Click(R.id.btn_main)
    void onMainClick(View view) {
    	Log.d("",mainTextView.getText().toString());
    }

}
{% endhighlight %}


* APT 동작

컴파일 실행

* 결과 코드

{% highlight bash %}
./build/generated/source/apt/{flavor}/{config}/{package}/MainActivity_.java
{% endhighlight %}

{% highlight java %}
public final class MainActivity_ extends MainActivity implements OnViewChangedListener {
	@Override
    public void onCreate(Bundle savedInstanceState) {
        OnViewChangedNotifier previousNotifier = OnViewChangedNotifier.replaceNotifier(onViewChangedNotifier_);
        init_(savedInstanceState);
        super.onCreate(savedInstanceState);
        OnViewChangedNotifier.replaceNotifier(previousNotifier);
        setContentView(layout.activity_main);
    }
    
     @Override
    public void onViewChanged(HasViews hasViews) {
        mainTextView = ((TextView) hasViews.findViewById(R.id.tv_main));
        mainButton = ((Button) hasViews.findViewById(R.id.btn_main));        
        if (mainButton!= null) {
            mainButton.setOnClickListener(new OnClickListener() {
                @Override
                public void onClick(View view) {
                    MainActivity_.this.onMainClick(view);
                }

            }
            );
        }
    }
    // 이하 생략...
}

{% endhighlight %}

그래들 빌드 스크립트에 android-apt 를 추가한 후 android-apt 를 프로젝트에 설정하면 컴파일시에 Android-Annotation 을 사용한 자바 코드를 찾아 위와 같이 새로운 코드를 생성하는 것을 확인할 수 있습니다.

## Android-Annotation 과 MVP

### 앱 시나리오

앱 목적 : 리눅스 릴리즈 상태 확인하기

EditText 에 리눅스 버전을 입력하면
Github 에 접근 하여 릴리즈 정보가 있는지 확인한다.

릴리즈 정보가 있으면 release 로 표시
릴리즈 정보가 없으면 not release 로 표시

### 기존 코드

{% highlight java %}
Public class MainActivity extends Activity {

	private EditText versionEdtiText;
	private Button checkButton;
	private TextView releaseText;
	
	private Handler handler;

	@Override
	public void onCreate(Bundle saveInstance) {
		super.onCreate(saveInstance);
		setContentView(R.layout.act_main);
		
		versionEdtiText = (EditText) findViewById(R.id.et_version);
		checkButton = (Button) findViewById(R.id.btn_check);
		releaseText = (TextView) findViewById(R.id.tv_release);
		handler = new Handler();
		
		checkButton.setOnClick(new View.OnClick() {
			@Override
			public void onClick(View view) {
				String version = versionEditText.getText().toString;
				
				new Thread(new VersionCheckRunnable(MainActivity.this, version, new Callback(){
				public void onCheckResult(final boolean isRelease) {
					handler.post(new Runnable(){
						public void run() {
							if (isRelease) {
								releaseText.setText("release);
							} else {
								releaseText.setText("not release);
							}
						}
					});
				}
				})).start();
			}
		});
	}
	
	static class VersionCheckRunnable implement Runnable {

		private final Context context;
		private final String version;		
		private final Callback callback;
		
		public VersionCheckRunnable(Context context, String version, Callback callback) {
			this.version = version;
			this.context = context;
			this.callback = callback;
		}
		
		@Override
		public void run() {
			boolean isReleased = getReleaseState(version);
			if (callback != null) {
				callback.onCheckResult(isReleased);
			}
		}
		
		private boolean getReleaseState(String version) {
			// ... 중략
		}
	}
	
	static interface Callback {
		void onCheckResult(boolean isReleased);
	}
}
{% endhighlight %}

위의 사례는 조금 극단적인 안드로이드 개발 코드입니다. MVC 조차로도 구현되어 있지 않은 코드 상태입니다.

이를 아래에서 Android-Annotation 을 이용하여 MVP 모델로 적용해보도록 하겠습니다.

### MVP 로 적용된 모습

{% highlight java %}
@EActivity(R.layout.act_main)
public class MainActivity extends Activity {

	@Bean
	MainPresenter mainPresenter;
	
	@Bean
	MainModel mainModel;

	@Click(R.id.btn_check)
	void onCheckClick(View view) {
		String versionText = mainPresenter.getVersionText();
		
		checkVersion(versionText);
	}
	
	@Background
	void checkVersion(String version) {
		boolean isRelease = mainModel.getReleaseState(version);
		
		if (isRelease) {
			mainModel.setReleaseText("release");
		} else {
			mainModel.setReleaseText("not release");
		}
	}

}
{% endhighlight %}

{% highlight java %}
@EBean
public class MainPresenter {

	@ViewById(R.id.et_version)
	EditText versionEditText;
	
	@ViewById(R.id.tv_release)
	TextView releaseText;

	public String getVersionText() {
		return versionEditText.getText().toString();
	}
	
	@UiThread
	public void setReleaseText(String version) {
		releaseText.setText(version);
	}
}
{% endhighlight %}

{% highlight java %}
@EBean
public class MainModel {

	public boolean getReleaseState(String version) {
		// ...중략...
		// 기존 VersionCheckRunnable 의 코드를 그대로 가져온다.
	}

}
{% endhighlight %}

### MVP 를 구현하기 위한 노하우

* MVP 의 Activity 는 View? ViewController!

Activity 의 역할이 가장 중요하다 View 의 성격도 같이 가지고 있는 Activity 에서 View 처리는 모두 Presenter 에서 처리하도록 합니다.
그리고 Activity 는 View 나 외부에서 들어오는 이벤트 등을 받아서 Model - Presenter 사이에서 로직을 제어하는 역할만 합니다.

* Callback 코드의 최소화

MVP 는 View 이벤트를 처리하기 위해서는 Presenter 에서 ViewController 로 다시 이벤트를 전달하는 Callback 을 별도로 구성해야 했습니다.

하지만 예제에서는 View 이벤트는 ViewController 에서 직접적으로 받을 수 있도록 하되 View 에 접근하는 코드를 최소화 하기 위해서 Event 에 대해서는 Annotation 을 통해 코드 가독성이 떨어지는 Callback 을 좀 더 Flat 하게 구조를 변경하였습니다.

간혹 Dialog 와 같이 직접적인 접근이 어려운 곳은 EventBus 와 같은 Observer 를 통해서 처리할 수 있도록 하여 가능한 구조의 일관성을 가지고자 합니다.

* Background 로직이 필요하는 경우

Android-Annotation 은 @Background 가 선언된 메소드는 Background 에서 동작하도록 제어합니다. 별도로 Thread 를 선언할 필요가 없으며 다시 Ui Thread 에 접근하고자 할 때는 @UiThread 를 통해 접근할 수 있습니다. 

또한 @SupposedBackground 와 @SupposedUiThread 를 통해서 현재 메소드가 원하는 Thread 에서 접근하는 것인지 Assertion 을 지원합니다. 위의 Annotation 은 Runtime 동작하여 Runtime 오류 가능성이 있습니다.

@Background -> @UiThread 접근시 유의점
@UiThread 가 선언된 코드는 내부 동작이 Handler.post(...) 를 통해서 실행됩니다. 따라서 @UiThread 를 연속으로 실행한다고 해서 동작의 순서가 보장되지 않습니다. 가급적 연관된 동작은 하나의 @UiThread 에 정의를 해주는 것이 좋습니다.


* DI 기능 적극 활용

ButterKnife 와 같은 DI 라이브러리들은 Runtime 시 class 구조를 분석하여 DI 가 동작합니다. 이는 필연적으로 Runtime 시 성능에 영향이 가는 동작방식입니다.

하지만 Android-Annotation 의 DI 는 Annotation Procession Tool (APT) 를 이용하여 동작하기 때문에 생성된 코드에 "_" 가 붙는 단점이 있긴 하나 DI 과정에서 성능상 영향을 거의 주지 않습니다.

## 결론

처음 Android-Annotation 을 접했을 때는 생성된 코드에 "_" 를 붙여야만 접근할 수 있는 시각적으로 좋지 않는 형태를 가지고 있었습니다.

하지만 이러한 단점을 제외한다면 구조적으로 MVP 모델에 매우 적합한 모습을 유지할 수 있는 코드를 만들어주는 장점을 가졌습니다.

경험적으로 MVC, MVVM, MVP 를 모두 구현하고자 했을 때 MVP 가 안드로이드에서는 가장 가독성이 좋은 모델을 유지하도록 해주었고 Android-Annotation 은 MVP 가 가지고 있는 ViewController - Presenter 간의 이벤트 Callback 처리에 대한 단점 또한 유연하게 대처할 수 있도록 해주었습니다. (@Click 과 같은 이벤트 Annotation 으로...)

현재 Jandi 팀은  Android-Annotation 과 MVP 모델을 적극적으로 도입하여 사용하고 있으며 UnitTest 작성에도 View 와 Model 이 완벽히 분리하여 작성할 수 있었습니다.

이 블로그를 보시는 독자분들도 도입 및 적용을 적극 권장합니다.


<br />


### 참고 블로그

[MVC, MVP, MVVM 의 이해 - 이항희][1]

[MVC, MVP AND MVVM - tomyrhymond][2]

[1]: http://atconsole.com/2013/06/05/mvc-mvp-mvvm-%EC%9D%98-%EC%9D%B4%ED%95%B4/
[2]: https://tomyrhymond.wordpress.com/2011/09/16/mvc-mvp-and-mvvm/
