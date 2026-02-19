<?php
get_header();
$events = warriors_modern_public_events(4);
?>
<section class="wm-home-grid">
  <article class="wm-card wm-hero">
    <p class="wm-eyebrow">Pittsburgh Warriors Hockey Club</p>
    <h1>Healing Through Hockey. Backed By Community.</h1>
    <p>The Pittsburgh Warriors give veterans a place to compete, recover, and reconnect. Your support keeps this program on the ice.</p>

    <div class="wm-stat-grid">
      <div class="wm-stat">
        <span>Upcoming events</span>
        <strong><?php echo esc_html(count($events)); ?></strong>
      </div>
      <div class="wm-stat">
        <span>Next public event</span>
        <strong>
          <?php
          if (!empty($events[0]['startsAt'])) {
              echo esc_html(date_i18n(get_option('date_format') . ', ' . get_option('time_format'), strtotime($events[0]['startsAt'])));
          } else {
              echo 'TBD';
          }
          ?>
        </strong>
      </div>
    </div>

    <div class="wm-cta-row">
      <a class="wm-btn wm-btn-gold" href="<?php echo esc_url(home_url('/donate')); ?>">Donate to the Program</a>
      <a class="wm-btn wm-btn-ghost" href="<?php echo esc_url(home_url('/events')); ?>">View Public Events</a>
      <a class="wm-btn wm-btn-dark" href="<?php echo warriors_modern_hq_url('/player'); ?>">Open Warrior HQ</a>
    </div>
  </article>

  <article class="wm-card wm-support">
    <h2>Why Support The Warriors</h2>
    <p>Your support funds ice time, travel, equipment support, and year-round operations that keep veterans in the game and connected.</p>
    <ul>
      <li>Programs designed for veterans and service-disabled athletes.</li>
      <li>Consistent practices, competitions, and community events.</li>
      <li>Direct impact you can see at every event.</li>
    </ul>
    <a class="wm-btn wm-btn-gold" href="<?php echo esc_url(home_url('/donate')); ?>">Give Today</a>
  </article>
</section>

<section class="wm-card wm-section">
  <div class="wm-section-head">
    <h3>Upcoming Events</h3>
    <a href="<?php echo esc_url(home_url('/events')); ?>">Full schedule</a>
  </div>

  <?php if (count($events) > 0): ?>
    <div class="wm-event-grid">
      <?php foreach ($events as $event): ?>
        <article class="wm-event">
          <h4><?php echo esc_html($event['title'] ?? 'Event'); ?></h4>
          <p>
            <?php
            if (!empty($event['startsAt'])) {
                echo esc_html(date_i18n(get_option('date_format') . ', ' . get_option('time_format'), strtotime($event['startsAt'])));
            } else {
                echo 'TBD';
            }
            ?>
          </p>
          <?php if (!empty($event['location'])): ?>
            <p><?php echo esc_html($event['location']); ?></p>
          <?php endif; ?>
          <a href="<?php echo warriors_modern_event_url($event); ?>">Open event details</a>
        </article>
      <?php endforeach; ?>
    </div>
  <?php else: ?>
    <p>No public events published yet.</p>
  <?php endif; ?>
</section>
<?php get_footer(); ?>
