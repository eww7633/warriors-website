<?php get_header(); ?>
<article class="wm-card wm-page">
  <h1>Program Updates</h1>
  <?php if (have_posts()): ?>
    <?php while (have_posts()): the_post(); ?>
      <section>
        <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
        <?php the_excerpt(); ?>
      </section>
      <hr />
    <?php endwhile; ?>
  <?php else: ?>
    <p>No posts yet.</p>
  <?php endif; ?>
</article>
<?php get_footer(); ?>
