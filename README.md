# website

website link:
https://mrv12341234.github.io/website/

Blog cover images and other images used on geniric pages saved in website/assets/img

**to add a new blog post, goto website/blog/index.html.
Under "<section class="post-list" aria-label="Blog posts list">" add a new blog post list item (just copy a previous one. Ensure you have a "<hr class="post-divider" />" between the new post and the next one).

You'll add a new folder to the blog folder. Create index.html file in this. Paste this into that file:

<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>We made it to China! What we packed and first week — Scott & Marissa’s Travels</title>
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
        


Youll put your post where PASTE POST HERE is. Youll use ai to do this. (maybe create a python script to do it?)