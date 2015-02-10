---
layout: default
category: teams
permalink: /teams/
title: Teams
description: 테크 블로그를 만드는 토스랩 식구들을 소개합니다.
---

<section class="teams">
	<h1>헬로월드</h1>
	<p>기술 블로그 또한 Github에 오픈소스로 공개되어있습니다. 그렇기 때문에 블로그 내용을 포함한 저희의 모든 활동에 대해 다양한 피드백과 <a href="http://help.github.com/send-pull-requests/">Pull request</a>를 기대합니다.</p>
	<h1>Blog author</h1>
	{% for authors in site.data.authors %}
	{% assign author = authors[1] %}
	<div class="author">
		{% include profile.md %}
		<h3>
			<span class="author-name">{{ author.nickname }}</span>
			<span class="author-outlink">
			{% if author.blog %}
				<a href="{{ author.blog }}" target="_blank"><i class="fa fa-home icon-blog"></i></a>
			{% endif %}
			{% if author.github %}
				<a href="https://github.com/{{ author.github }}" target="_blank"><i class="fa fa-github icon-github"></i></a>
			{% endif %}
			{% if author.facebook %}
				<a href="https://facebook.com/{{ author.facebook }}" target="_blank"><i class="fa fa-facebook-square icon-facebook"></i></a>
			{% endif %}
			{% if author.twitter %}
				<a href="https://twitter.com/{{ author.twitter }}" target="_blank"><i class="fa fa-twitter-square icon-twitter"></i></a>
			{% endif %}
			</span>
		</h3>
		<p class="author-bio">
			{{ author.bio }}
		</p>
	</div>
	{% endfor %}
</section>
