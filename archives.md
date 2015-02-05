---
layout: default
category: archives
permalink: /archives/
title: JANDI tech blog
description: 안녕하세요. 잔디 서비스를 개발중인 토스랩 식구들의 블로그입니다.
---

<article>
<!-- from http://www.mitsake.net/2012/04/archives-in-jekyll/ -->
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
</article>
