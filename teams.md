---
layout: default
category: teams
permalink: /teams/
title: Teams
description: 테크 블로그를 만드는 토스랩 식구들을 소개합니다.
---

<section>
	<h1>헬로월드</h1>
	<p>기술 블로그 또한 Github에 오픈소스로 공개되어있습니다. 그렇기 때문에 블로그 내용을 포함한 저희의 모든 활동에 대해 다양한 피드백과 <a href="http://help.github.com/send-pull-requests/">Pull request</a>를 기대합니다.</p>
	<h2>Blog author</h2>
	{% for authors in site.authors %}
	{% assign author = authors[1] %}
	<div class="author">
		{% include profile.md %}
		<h4 class="section-title author-name">{{author.nickname}}</h4>
		<p class="author-bio">{{author.bio}}</p>
	</div>
	{% endfor %}
</section>
