{% if author.gravatar %}
<img src="http://www.gravatar.com/avatar/{{ author.gravatar }}" class="img-rounded profile" />
{% elsif author.email %}
<img src="{{ site.BASE_PATH }}/assets/media/profiles/{{ author.email }}.jpg" class="img-rounded profile" alt="{{ author.email }}" />
{% else %}
<img src="{{ site.BASE_PATH }}/assets/media/profiles/larva.jpg" class="img-rounded profile" alt="larva"/>
{% endif %}