<?php
get_header();
while (have_posts()): the_post();
  $slug = get_post_field('post_name', get_the_ID());
?>
<article class="wm-card wm-page">
  <div class="wm-subnav">
    <a class="wm-chip" href="<?php echo esc_url(home_url('/about')); ?>">About</a>
    <a class="wm-chip" href="<?php echo esc_url(home_url('/about/leadership')); ?>">Leadership</a>
    <a class="wm-chip" href="<?php echo esc_url(home_url('/about/roster')); ?>">Roster</a>
    <a class="wm-chip" href="<?php echo esc_url(home_url('/about/wall-of-champions')); ?>">Wall of Champions</a>
    <a class="wm-chip" href="<?php echo esc_url(home_url('/about/galleries')); ?>">Galleries</a>
  </div>

  <?php if (is_page('about')): ?>
    <h1>About The Pittsburgh Warriors</h1>
    <p class="wm-muted">We are a veterans-first hockey community focused on healing, structure, competition, and service.</p>
    <div class="wm-grid-2">
      <section class="wm-info-card">
        <h3>Mission</h3>
        <p>Provide a cathartic team environment that supports physical and mental healing through hockey.</p>
      </section>
      <section class="wm-info-card">
        <h3>Vision</h3>
        <p>Build a lasting culture where veterans can recover, compete, and lead in community.</p>
      </section>
    </div>
    <section class="wm-info-card" style="margin-top:.8rem;">
      <h3>Explore About Subpages</h3>
      <ul class="wm-bullets">
        <li><a href="<?php echo esc_url(home_url('/about/leadership')); ?>">Leadership</a></li>
        <li><a href="<?php echo esc_url(home_url('/about/roster')); ?>">Roster</a></li>
        <li><a href="<?php echo esc_url(home_url('/about/wall-of-champions')); ?>">Wall of Champions</a></li>
        <li><a href="<?php echo esc_url(home_url('/about/galleries')); ?>">Galleries</a></li>
      </ul>
    </section>
  <?php elseif (is_page('donate')): ?>
    <h1>Fund Veteran Healing Through Hockey</h1>
    <p class="wm-muted">Every contribution supports veterans in training, travel, equipment, and year-round operations.</p>
    <div class="wm-grid-3">
      <section class="wm-info-card"><h3>$50</h3><p>Covers practice ice and training supplies.</p></section>
      <section class="wm-info-card"><h3>$150</h3><p>Supports equipment and safety gear for veterans.</p></section>
      <section class="wm-info-card"><h3>$500+</h3><p>Contributes to travel, lodging, and event operations.</p></section>
    </div>
    <section class="wm-info-card" style="margin-top:.8rem;">
      <h3>Where Donations Go</h3>
      <ul class="wm-bullets">
        <li>Ice time and coaching support</li>
        <li>Adaptive and replacement equipment</li>
        <li>Tournament logistics and travel</li>
        <li>Community events and outreach</li>
      </ul>
      <p><a class="wm-btn wm-btn-gold" href="mailto:donate@pghwarriorhockey.us">Donate Securely</a></p>
    </section>
  <?php elseif (is_page('partners')): ?>
    <h1>Community Partners & Sponsors</h1>
    <p class="wm-muted">Mission-aligned partners keep veterans on the ice and sustain long-term program impact.</p>
    <div class="wm-grid-2">
      <section class="wm-info-card">
        <h3>Partnership Priorities</h3>
        <ul class="wm-bullets">
          <li>Ice time and training resources</li>
          <li>Travel and tournament logistics</li>
          <li>Equipment support for veterans</li>
          <li>Year-round community programming</li>
        </ul>
      </section>
      <section class="wm-info-card">
        <h3>Become A Supporter</h3>
        <p>We offer visibility, community impact, and direct program outcomes for your support.</p>
        <p><a class="wm-btn wm-btn-gold" href="mailto:partners@pghwarriorhockey.us">Sponsor Opportunities</a></p>
      </section>
    </div>
  <?php elseif (in_array($slug, ['leadership', 'roster', 'wall-of-champions', 'galleries'], true)): ?>
    <h1><?php the_title(); ?></h1>
    <p class="wm-muted">This section is part of the About structure and is ready for your official content and media.</p>
    <section class="wm-info-card">
      <h3>Content Block</h3>
      <div class="wm-page-content"><?php the_content(); ?></div>
    </section>
  <?php else: ?>
    <h1><?php the_title(); ?></h1>
    <div class="wm-page-content"><?php the_content(); ?></div>
  <?php endif; ?>
</article>
<?php
endwhile;
get_footer();
