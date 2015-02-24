// Capitalises a string
// Accepts:
//   str: string
// Returns:
//   string
var majusculeFirst = function(str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
};

// Retrieves the value of a GET parameter with a given key
// Accepts:
//   param: string
// Returns:
//   string or null
var getParam = function(param) {
    var queryString = window.location.search.substring(1),
        queries = queryString.split('&');
    for (var i in queries) {
        var pair = queries[i].split('=');
        if (pair[0] === param) {
            // Decode the parameter value, replacing %20 with a space etc.
            return decodeURI(pair[1]);
        }
    }

    return null;
};

// Filters posts with the condition `post['property'] == value`
// Accepts:
//   posts - array of post objects and a string
//   property - string of post object property to compare
//   value - filter value of property
// Returns:
//   array of post objects
var filterPostsByPropertyValue = function(posts, property, value) {
    var filteredPosts = [];
    // The last element is a null terminator
    posts.pop();
    for (var i in posts) {
        var post = posts[i],
            prop = post[property];

        // Last element of tags is null
        post.tags.pop();

        // The property could be a string, such as a post's category,
        // or an array, such as a post's tags
        if (prop.constructor === String) {
            if (prop.toLowerCase() === value.toLowerCase()) {
                filteredPosts.push(post);
            }
        } else if (prop.constructor === Array) {
            for (var j in prop) {
                if (prop[j].toLowerCase() === value.toLowerCase()) {
                    filteredPosts.push(post);
                }
            }
        }
    }

    return filteredPosts;
};

// Formats search results and appends them to the DOM
// Accepts:
//   property: string of object type we're displaying
//   value: string of name of object we're displaying
//   posts: array of post objects
// Returns:
//   undefined
var layoutResultsPage = function(property, value, posts) {
    var $container = $('#search');
    if ($container.length === 0) return;

    // Update the header
    $container.find('h3').html('<i class="fa fa-search"></i>' + majusculeFirst(value) + '');

    // Loop through each post to format it
    $results = $container.find('ul.results');
    for (var i in posts) {
        // Create an unordered list of the post's tags
        var post  = posts[i];
        var tags = post.tags;

        var tagsList = '<ul class="tags"><i class="fa fa-tags"></i>';
        for (var j in tags) {
            tagsList += '<li><a href="/search/?tags=' + tags[j] + '">' + tags[j].toLowerCase() + '</a></li>';
        }
        tagsList += '</ul>';

        $results.append(
            '<li>'
                + '<div class="meta">'
                    + '<span class="date">' + post.date.formatted + '</span>'
                    + '<span class="name nickname">' + post.author + '</span>'
                + '</div>'
                + '<h2>'
                    + '<a href="' + post.href + '">' + post.title + '</a>'
                + '</h2>'
                + tagsList
            + '</li>'
        );
    }
};

// Formats the search results page for no results
// Accepts:
//   property: string of object type we're displaying
//   value: string of name of object we're displaying
// Returns:
//   undefined
var noResultsPage = function(property, value) {
    $('#search').find('h3').text('No Results Found.').after('<p>We couldn\'t find anything associated with ‘' + value + '’ here.</p>');
};

// Replaces ERB-style tags with Liquid ones as we can't escape them in posts
// Accepts:
//   elements: jQuery elements in which to replace tags
// Returns:
//   undefined
var replaceERBTags = function(elements) {
    elements.each(function() {
        // Only for text blocks at the moment as we'll strip highlighting otherwise
        var $this = $(this),
            txt   = $this.html();

        // Replace <%=  %>with {{ }}
        txt = txt.replace(new RegExp('&lt;%=(.+?)%&gt;', 'g'), '{{$1}}');
        // Replace <% %> with {% %}
        txt = txt.replace(new RegExp('&lt;%(.+?)%&gt;', 'g'), '{%$1%}');

        $this.html(txt);
    });
};

$(function() {
    var parameters = ['category', 'tags'];
    var map = {}
    for (var idx in parameters) {
        map[parameters[idx]] = getParam(parameters[idx]);
    }


    console.log("map>", map);

    $.each(map, function(type, value) {
        console.log(type, value)
        if (value !== null) {
            $.getJSON('/search.json', function(data) {
                posts = filterPostsByPropertyValue(data, type, value);
                console.log("posts>", posts);
                if (posts.length === 0) {
                    noResultsPage(type, value);
                } else {
                    console.log("!!!");
                    layoutResultsPage(type, value, posts);
                }
            });
        }
    });

    // Replace ERB-style Liquid tags in highlighted code blocks...
    replaceERBTags($('div.highlight').find('code.text'));
    // ... and in inline code
    replaceERBTags($('p code'));
});
