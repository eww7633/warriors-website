<?php get_header(); ?>
<article class="wm-card wm-page">
  <?php while (have_posts()): the_post(); ?>
    <h1><?php the_title(); ?></h1>
    <div class="wm-page-content"><?php the_content(); ?></div>
  <?php endwhile; ?>
</article>
<?php get_footer(); ?>
