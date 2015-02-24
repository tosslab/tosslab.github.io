---
layout: default
category: archives
permalink: /archives/
title: JANDI tech blog
description: 안녕하세요. 잔디 서비스를 개발중인 토스랩 식구들의 블로그입니다.
---

<!-- from http://www.mitsake.net/2012/04/archives-in-jekyll/ -->
<!--<article>
{% for post in site.posts %}
	{% capture month %}{{ post.date | date: '%m%Y' }}{% endcapture %}
	{% capture nmonth %}{{ post.next.date | date: '%m%Y' }}{% endcapture %}
		{% if month != nmonth %}
			{% if forloop.index != 1 %}</ul>{% endif %}
			<h3>{{ post.date | date: '%Y년 %m월' }}</h3><ul>
		{% endif %}
	<li>
		<a href="{{ post.url }}">{{ post.title }}</a>
		<span class="date">{{ post.date | date: "%Y-%m-%d" }}</span>
	</li>
{% endfor %}
</article>-->

<section class="archives">
{% for post in site.posts %}
	{% unless post.next %}
		<h3 class="archives-year">{{ post.date | date: '%Y년' }}</h3><ul class="archives-posts">
	{% else %}
		{% capture year %}{{ post.date | date: '%Y' }}{% endcapture %}
		{% capture nyear %}{{ post.next.date | date: '%Y' }}{% endcapture %}
		{% if year != nyear %}
			{% if forloop.index != 1 %}</ul>{% endif %}
			<h3 class="archives-year">{{ post.date | date: '%Y년' }}</h3><ul class="archives-posts">
		{% endif %}
	{% endunless %}
	<li>
		<div class="meta">
			<span class="date">{{ post.date | date:"%m월 %d일" }}</span>
			<span class="name nickname">{{ site.data.authors[post.author].nickname }}</span>
		</div>
		<h2>
			<a href="{{ post.url }}">{{ post.title }}</a>
		</h2>
		<ul class="tags">
			<i class="fa fa-tags"></i>
			{% for tag in post.tags %}
            <li>
                <a href="/search/?tags={{ tag }}">{{ tag | downcase }}</a>
            </li>
            {% endfor %}
		</ul>
	</li>
{% endfor %}
</section>
