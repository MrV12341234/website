# website

website link:
https://mrv12341234.github.io/website/

-To test website in VS Code, right click the index.html in the main folder and select 'Live Server' (need to install this plugin in vs code)

Blog cover images and other images used on geniric pages saved in website/assets/img/

**to add a new blog post, goto website/blog/index.html.
Under "<section class="post-list" aria-label="Blog posts list">" add a new blog post list item (just copy a previous one. Ensure you have a "<hr class="post-divider" />" between the new post and the next one).

You'll add a new folder to the blog folder (the title). Create index.html file in this. Paste this into that file:

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Title — Scott & Marissa’s Travels</title> <!-- change this to the blog post title-->
  <meta name="description" content="Our China Arrival blog post." />

  <!-- We are in /blog/chinaArrival/ so go up TWO levels -->
  <link rel="stylesheet" href="../../assets/css/styles.css" />
</head>

<body id="top">
  <header class="site-header">
    <div class="container header-inner">
      <a class="site-title" href="../../">Scott &amp; Marissa’s Travels</a>

      <nav class="site-nav" aria-label="Primary">
        <a href="../../about/">About</a>
        <a href="../../blog/">Blog</a>
        <a href="../../contact/">Contact</a>
        <a href="../../">Homepage</a>
        <a href="../../photos/">Photos</a>
      </nav>
    </div>
  </header>

  <main class="container section post-page">
    <a class="back-link" href="../">← Back to Blog</a>

    <h1 class="post-title">We made it to China! What we packed and first week!</h1>
    <p class="post-meta">August 2023 </p>

    
         <img class="post-hero" src="../../assets/img/italyCover.jpg" alt="China Arrival cover photo" />
    

    <div class="post-body">

        <!-- PASTE POST HERE -->

</div>
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <nav class="footer-nav" aria-label="Footer">
        <a href="../../about/">About</a>
        <a href="../../blog/">Blog</a>
        <a href="../../contact/">Contact</a>
        <a href="../../">Homepage</a>
        <a href="../../photos/">Photos</a>
      </nav>

      <p class="footer-note">
        © <span id="year"></span> Scott &amp; Marissa’s Travels
      </p>
    </div>
  </footer>

  <script src="../../assets/js/main.js" defer></script>
</body>
</html>
        


Youll put your post where <!--PASTE POST HERE--> is. 
Next, from the file: website/blog/italy/ copy the python script "import_gdoc_export.py" and paste into your new post folder.
(This is the script that will convert the google html and link your local images into index.html)

Next, goto the google doc of the post you have written. Select: File -> Download -> Web Pge (html) 
This will generate a folder named "images" and an html file. Put both of these files into your blog post folder (eg. websit/blog/italy)
Rename the html file to "gdoc-export.html"
Leave the images file alone

At this point you need these 4 items in your blog post folder:
-images (containing all your images)
-import_gdoc_export.py
-index.html (your index with the above )
-gdoc-export.html (the google docs html)

Open a file explorer and goto your blog post folder so you see the above 4 items. 
"website/blog/italy/"
In the top bar type "cmd"

the cmd terminal will open 
Depending on which computer you're using, might need to install this:
py -m pip install beautifulsoup4

^Type this and press enter^

next, run your import gdoc script by typing this:
py import_gdoc_export.py



Extra info:
(inside website/blog/ italy there is "gdoct_to_post.py" It was an experimental script that did the same as the above, but it required you to paste the google doc link into the script and it downloaded everything for you. It never quite worked right)
Inside websit/blog/india are 2 phython scripts and "wp-export.html". This was how i converted all the blog posts from word press here. 
I put the word press html into "wp-export.html". THen first ran "download_india_images". Then ran Build_india_post.py



