---
layout: post
title: "다양한 형태를 지원하는 리스트 UI, 잘 그리고 계신가요?"
date: 2016-04-09
description: 1년 반 정도 사용해온 MultiItemAdapter 를 소개합니다.
author: tony
categories: [android]
tags: [android, list, recyclerview, multi]
fullview: true
---

# 다양한 형태가 반복되는 UI를 RecyclerView.Adapter 를 이용해서 깔끔하게 만들고 싶었어요.

대략 1년 반 전, 5.0 롤리팝과 함께 나타난 `RecyclerView`.
`ListView` 를 이용할 때 아주 기초적이고 정석적인 개념으로 사용되던 `ViewHolder` pattern 을 반 강제화? 하면서 동시에 성능까지 개선한 `ListView` 의 개량버전.

앱 시장이 활성화되면서 한 가지 타입의 뷰만 반복적으로 보여주는 단순한 구성보다는 다양한 타입의 뷰를 보여주는 앱들이 많아지고 보편화 된 시점에 이것을 구현하기 위한 `Adapter.getView` 메소드는 혼돈.chaos 가 되었지요.
가독성을 높일만한 나름대로의 시도를 해보고 있을 때, `RecyclerView` 가 갑툭튀 했고 이걸 이용하면 원하는 만큼의 많은 타입의 뷰를 "가독성 좋게 만들어 볼 수 있겠다" 라는 생각이 들었습니다.

그래서 `RecyclerView.Adapter` 를 상속 받아 다양한 타입의 뷰를 바인딩 할 수 있게 도와주는 헬퍼 클래스, `MultiItemAdapter` 라는 것을 만들어 보게 됐습니다. 구 회사 프로덕트에 적용해보기도 하고, 개인 프로젝트에 넣어보기도 하고, 토스랩에서 서비스하고 있는 "잔디"에 녹여내보기도 했는데 나쁘지 않은 느낌이들어 그 과정을 공유하고 많은 분들께 피드백도 받고 싶습니다. 또, 어떻게 더 잘 활용하고 계신지 여쭙고 싶습니다.

 
### RecyclerView.Adapter 의 이해를 위해 단순단순하게 만들어보자


```java
public class BasicAdapter extends RecyclerView.Adapter<BasicAdapter.MyViewHolder> {
    
    private List<String> mItems = new ArrayList<>();
    
    @Override
    public MyViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext())
                .inflate(android.R.layout.simple_list_item_1, parent, false);
        return new MyViewHolder(itemView);
    }

    @Override
    public void onBindViewHolder(MyViewHolder holder, int position) {
        holder.mTextView.setText(mItems.get(position));   
    }

    class MyViewHolder extends RecyclerView.ViewHolder {
        private TextView mTextView;
        public MyViewHolder(View itemView) {
            super(itemView);
            mTextView = (TextView) itemView.findViewById(android.R.id.text1);
        }
    }
    ...
```

이런 식으로 구현하면 되는군, 하지만 내가 최종적으로 원하는 건 다양한 `ViewHolder` 를 다뤄야 되는 건데 `ViewHolder` 가 많아지는 경우 inner class 는 쓰면 안되겠다! `ViewHolder` 들은 따로 패키지 만들어서 관리하자.
음 근데 `ViewHolder` 를 구성하고 난 다음 어떻게 그려지는 지에 대해 궁금하면 다시 어댑터를 찾아가야 되고, 반대로 어댑터에서 `ViewHolder` 내 구성요소가 어떻게 생겼는지 궁금하면 다시 `ViewHolder` 찾아가서 뒤져봐야되는 군. 이건 비효율 적인 것 같다. `ViewHolder` 에 뷰를 그리는 메소드를 하나 만들자. 아 기왕이면 추상화된 클래스를 만들어 돌려돌려 쓰자. 하나 더 *Generic* 을 사용하자.

```java
public abstract class BaseViewHolder<ITEM> extends RecyclerView.ViewHolder {

    public BaseViewHolder(View itemView) {
        super(itemView);
    }

    public abstract void onBindView(ITEM item);

}
```
뷰를 그리는데 쓰이는 객체는 *Generic* 을 이용하면 `ViewHolder` 안에서 그리는 작업 또한 해결이 가능하겠군!
이걸 이용해서 다시 만들어보자.

```java
public class MyViewHolder extends BaseViewHolder<String> {

    private TextView mTextView;

    public MyViewHolder(View itemView) {
        super(itemView);
        mTextView = (TextView) itemView.findViewById(android.R.id.text1);
    }

    @Override
    public void onBindView(String item) {
        mTextView.setText(item);
    }
}
...
public class BaseAdapter extends RecyclerView.Adapter<MyViewHolder> {

    private List<String> mItems = new ArrayList<>();

    @Override
    public MyViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext())
                .inflate(android.R.layout.simple_list_item_1, parent, false);
        return new MyViewHolder(itemView);
    }

    @Override
    public void onBindViewHolder(MyViewHolder holder, int position) {
        holder.onBindView(mItems.get(position));
    }

    public void setItems(List<String> items) {
        mItems.clear();
        mItems.addAll(items);
    }

    @Override
    public int getItemCount() {
        return mItems.size();
    }
}
```
음 원하는 모양새다. 근데 이제 `Adapter` 에선 `ViewHolder` 에 들어갈 layout 이 어떤 건지 관심꺼도 되겠네. 게다가 `ViewHolder` 에서 layout 궁금하면 다시 또 찾아와야 되는게 문제다.
좀 더 명시적인 방법으로 Factory method 로 생성자를 제한해보자. `RecyclerView.ViewHolder` 는 `View` 를 가지는 생성자가 강제되니 이렇게 바꾸자.

```java
public static MyViewHolder newInstance(ViewGroup parent) {
    View itemView = LayoutInflater.from(parent.getContext())
            .inflate(android.R.layout.simple_list_item_1, parent, false);
    return new MyViewHolder(itemView);
}

private MyViewHolder(View itemView) {
    super(itemView);
    mTextView = (TextView) itemView.findViewById(android.R.id.text1);
}
```
이렇게 하면 어떤 layout 을 다루고 있는지도 금방 알 수 있겠다. 이 정도만 되도 구색을 다 갖춘듯하니 이 느낌으로 다양한 타입의 뷰들을 다뤄보자.

```java
public class BasicMultiTypeAdapter extends RecyclerView.Adapter<BaseViewHolder> {

    public static final int VIEW_TYPE_A = 0;
    public static final int VIEW_TYPE_B = 1;
    private List<String> mItems = new ArrayList<>();

    @Override
    public BaseViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        if (viewType == VIEW_TYPE_A) {
            return AViewHolder.newInstance(parent);
        } else {
            return BViewHolder.newInstance(parent);
        }
    }

    @Override
    public void onBindViewHolder(BaseViewHolder holder, int position) {
        holder.onBindView(mItems.get(position));
    }

    public void setItems(List<String> items) {
        mItems.clear();
        mItems.addAll(items);
    }

    @Override
    public int getItemCount() {
        return mItems.size();
    }

    @Override
    public int getItemViewType(int position) {
        if (position % 2 == 0) {
            return VIEW_TYPE_A;
        } else {
            return VIEW_TYPE_B;
        }
    }
}
```
음 깔끔하긴 하다. 근데 `getItemViewType` 이 스크롤 할 때마다 불릴 텐데, 분기도 많고 연산이 생겼을 때 스크롤 속도에 괜한 영향을 줄 듯? view type 을 차라리 미리 가지고 있게 만들자. 
또! 가만보니 한 타입의 객체를 이용해서 다른 스타일로 뷰를 보여줄 뿐이었네. 이것도 여러가지 객체를 담을 수 있게 만들어야지.

뷰를 그릴 대상이 될 객체랑 타입을 가지는 Wrapper class 를 만들어서 해결하자.
이러면 `Adapter.onBindViewHolder` 랑 `Adapter.getItemViewType` 도 해결이 되겠군. 

```java
public abstract class MultiItemAdapter extends RecyclerView.Adapter<BaseViewHolder> {

    private List<Row<?>> mRows = new ArrayList<>();

    @SuppressWarnings("unchecked")
    @Override
    public void onBindViewHolder(BaseViewHolder holder, int position) {
        holder.onBindView(getItem(position));
    }

    @SuppressWarnings("unchecked")
    public <ITEM> ITEM getItem(int position) {
        return (ITEM) mRows.get(position).getItem();
    }

    public void setRows(List<Row<?>> mRows) {
        mRows.clear();
        mRows.addAll(mRows);
    }

    @Override
    public int getItemCount() {
        return mRows.size();
    }

    @Override
    public int getItemViewType(int position) {
        return mRows.get(position).getItemViewType();
    }

    public static class Row<ITEM> {
        private ITEM item;
        private int itemViewType;

        private Row(ITEM item, int itemViewType) {
            this.item = item;
            this.itemViewType = itemViewType;
        }
        
        public static <T> Row<T> create(T item, int itemViewType) {
            return new Row<>(item, itemViewType);
        }

        public ITEM getItem() {
            return item;
        }

        public int getItemViewType() {
            return itemViewType;
        }
    }

}
```

### MultiItemAdapter 완성.

네, 저는 이렇게 만들어서 1년 반 정도 필요한 부분(복잡해 질만한 부분)에 이 클래스를 상속받아 구현했습니다.
사용방법을 예로들어 데이터베이스나 서버로부터 긁어온 아이템들을 타입에 따라 A, B로 나눠서 보워줘야 한다면,

```java
// MutiItemAdapter 구현
public class AdvancedItemAdapter extends MultiItemAdapter {

    public static final int VIEW_TYPE_A = 0;
    public static final int VIEW_TYPE_B = 1;

    @Override
    public BaseViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        if (viewType == VIEW_TYPE_A) {
            return AViewHolder.newInstance(parent);
        } else {
            return BViewHolder.newInstance(parent);
        }
    }

}

// Activity 나 Fragment 등 view 요소에서 ListAdapter item setting.
public void setItems(List<Item> items) {
    List<MultiItemAdapter.Row<?>> rows = new ArrayList<>();

    for (int i = 0; i < items.size(); i++) {
        Item item = items.get(i);
        if (item.getType().equals("A")) {
            rows.add(
                MultiItemAdapter.Row.create(item, AdvancedItemAdapter.VIEW_TYPE_A));
        } else {
            rows.add(
                MultiItemAdapter.Row.create(item, AdvancedItemAdapter.VIEW_TYPE_B));
        }
    }

    mAdvancedItemAdapter.setRows(rows);
}
```

이렇게 해주면 됩니다. 그런데 위 사용방법을 보면 추가적인 새로운 타입(Row)의 List 와 반복문을 돌려야 된다는 것이 단점으로 보이는데요.
그럼 이 클래스를 사용하지 않고 직접 구현한 결과를 좀 볼까요?

```java
public class NormalItemAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    public static final int VIEW_TYPE_A = 0;
    public static final int VIEW_TYPE_B = 1;

    private List<Item> mItems = new ArrayList<>();

    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        if (viewType == VIEW_TYPE_A) {
            View itemView = LayoutInflater.from(parent.getContext())
                    .inflate(android.R.layout.simple_list_item_1, parent, false);
            return new AViewHolder(itemView);
        } else {
            View itemView = LayoutInflater.from(parent.getContext())
                    .inflate(android.R.layout.simple_list_item_1, parent, false);
            return new BViewHolder(itemView);
        }
    }

    @Override
    public void onBindViewHolder(RecyclerView.ViewHolder holder, int position) {
        if (holder instanceof AViewHolder) {
            Item item = getItem(position);
            ((AViewHolder) holder).getTextView().setText(item.getName());
        } else {
            ((BViewHolder) holder).getTextView().setText("I am B.");
        }
    }

    private Item getItem(int position) {
        return mItems.get(position);
    }

    public void setItems(List<Item> items) {
        mItems.clear();
        mItems.addAll(items);
    }

    @Override
    public int getItemViewType(int position) {
        if (getItem(position).getType().equals(Item.ITEM_TYPE_A)) {
            return VIEW_TYPE_A;
        } else {
            return VIEW_TYPE_B;
        }
    }

    @Override
    public int getItemCount() {
        return mItems.size();
    }
}
```
뭐, 나쁘진 않습니다. 이 정도 수준으로 개발이 끝나도 되고 추가적인 확장이 필요하지 않아보인다면 굳이 `MultiItemAdapter` 를 쓸 필요가 없습니다.

중요성을 가지는 리스트 위주의 화면에서 위와 같이 개발된다면 당장 보이는 제 불만은 `onCreateViewHolder`, `onBindViewHolder` 계속해서 분기가 들어가게 되고 `getItemViewType` 에서는 계속 해서 List 데이터에 접근해야 한다는 것입니다. 접근 자체가 큰 문제, 큰 영향을 끼치지 않을 정도 규모의 자료구조라면 논외로 치더라도, 뷰 타입이 조금만 늘어나도 `onCreateViewHolder`, `onBindViewHolder` 의 덩치는 엄청 커질 겁니다. 

예를들면 맨 마지막 아이템 타입이 B 이고 현재 추가 될 아이템 타입이 A인 경우에는 다른 형태의 디바이더를 넣어야 한다던지 하는 추가적인 확장이 이루어져야 한다면 골치가 꽤 아플겁니다. 특히 저는 위 예와 비슷하게 뷰 타입에 따라 각기 다른 아래 위 마진값을 요구받을 때, `ViewHolder` 마다 이전 데이터를 참고하게 만들고 동적으로 Visibility 처리를 하거나 `MarginLayoutParams` 를 고치는 것이 비효율적으로 느껴져서 `height`를 주입받는 **DividerViewHolder** 를 하나 만들어 사용하곤 했습니다. 
이렇게 하니 각각의 `ViewHolder` 들이 데이터들에 의존적이지 않게 코딩이 가능했었습니다. 한 가지 더 예를들어 리스트 중간 중간 광고가 보여지게 되고 이 광고 클래스는 완전히 다른 객체로부터 보여줘야 한다 라고 했을 때 `MultiItemAdapter` 를 이용하면 쉽게 해결이 가능합니다.

정작 근 1년간 "잔디"를 만들면서는 자주 쓰진 않았는데, 작년부터 각광받기 시작한 MVP 패턴을 사용할 때 `View` 에서의 로직을 최소화 하려고 한다면 써먹을 수 있는 모델로 적합하지 않나 생각이 들면서 다시 사용하기 시작했습니다. `Presenter` 에서 `Row` 를 만들어 던져주면 `View` 는 그것을 그대로 사용하게 만들 수 있다는 생각이 들었거든요.(아직까지는 비교적 크지 않은 부분에서만 사용하게 되서 `View(MainThread)`에서 `Row` 를 만들게 코딩해 놓은 컴퍼넌트가 더 많네요 흑흑) 더 복잡한 구조를 갖는 컴퍼넌트를 만들어야 할 때는 비동기 스레드에서 `Row` 까지 만들어 내보내는 것도 해볼까 하는 생각도 듭니다.   

제 눈에만 괜찮은 구조인지, 생각지도 못한 치명적인 단점이 있진 않은지, 구조나 설계 측면에서 안 좋은 점은 있지 않은지, 논리없이 `Generic` 으로 "퉁" 치고 있는 코드는 아닌지, 여러가지가 많이 궁금합니다 ^^
`MultiItemAdapter` 를 쓴 것과 안 쓴것의 정말 심플한 비교 소스를 열어놓았습니다 [MultiItemAdapter](https://github.com/tonyjs/Sample_MultiItemAdapter)
또, 여러분들은 어떻게 구현하고 계신지요? 여러분의 관심이 필요합니다 ! :) 