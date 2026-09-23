window.addEventListener("load", function() { 
    var thumbs = document.getElementById("thumbnails");
    // use event delegation ... instead of having a handler for
    // each thumbnail, put the handler on the parent container instead
    thumbs.addEventListener("click", function (e) {
        // user could click on different things in the parent container,
        // so we need to check if user has clicked on a thumbnail image
        if (e.target.nodeName.toLowerCase() == 'img') {
            // get image filename of clicked thumbnail
            var clickedImageSource = e.target.src;   
            // replace the folder name of the image 
            var newSrc = clickedImageSource.replace("small", "medium");            
            // change the filename and title attribute of the large image 
            // to the new one (the one just clicked on)
            var featuredImage = document.querySelector("#featured img");
            featuredImage.src = newSrc; 
            featuredImage.title = e.target.title;
        }
    });
    // add mouse over/out handlers for large image
    var featured = document.getElementById("featured");
    featured.addEventListener("mouseover", function (e) {
        // fade the caption into view
        var caption = document.querySelector("#featured figcaption");
        caption.style.transition = "opacity 1.5s"; 
        caption.style.opacity = 0.80;        
        caption.innerHTML = document.querySelector("#featured img").title;
    });
    featured.addEventListener("mouseout", function (e) {   
        // fade the caption into invisibility
        var caption = document.querySelector("#featured figcaption");
        caption.style.transition = "opacity 1.5s"; 
        caption.style.opacity = 0; 
    });
});