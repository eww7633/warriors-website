<!doctype html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<div class="wm-topbar"></div>
<header class="wm-header">
  <div class="wm-shell wm-header-inner">
    <a class="wm-brand" href="<?php echo esc_url(home_url('/')); ?>">
      <img src="<?php echo esc_url(home_url('/wp-content/uploads/2025/11/Site-Icon.png')); ?>" alt="Pittsburgh Warriors logo" />
      <span>
        <span class="wm-brand-title">Pittsburgh Warriors Hockey Club</span>
        <span class="wm-brand-sub">Veterans healing through hockey</span>
      </span>
    </a>

    <button class="wm-menu-toggle" type="button" aria-controls="wm-mobile-panel" aria-expanded="false">
      <span>Menu</span>
    </button>

    <div id="wm-mobile-panel" class="wm-panel">
      <nav class="wm-nav" aria-label="Primary">
        <ul>
          <li class="wm-has-submenu">
            <a href="<?php echo esc_url(home_url('/about')); ?>">About Us</a>
            <button class="wm-sub-toggle" type="button" aria-expanded="false" aria-label="Toggle About subpages">+</button>
            <ul class="wm-submenu">
              <li><a href="<?php echo esc_url(home_url('/about/leadership')); ?>">Leadership</a></li>
              <li><a href="<?php echo esc_url(home_url('/about/roster')); ?>">Roster</a></li>
              <li><a href="<?php echo esc_url(home_url('/about/wall-of-champions')); ?>">Wall of Champions</a></li>
              <li><a href="<?php echo esc_url(home_url('/about/galleries')); ?>">Galleries</a></li>
            </ul>
          </li>
          <li><a href="<?php echo esc_url(home_url('/donate')); ?>">Donate</a></li>
          <li><a href="<?php echo esc_url(home_url('/partners')); ?>">Partners</a></li>
          <li><a href="<?php echo esc_url(home_url('/join')); ?>">Join</a></li>
          <li><a href="<?php echo esc_url(home_url('/events')); ?>">Events</a></li>
        </ul>
      </nav>

      <div class="wm-actions">
        <a class="wm-btn wm-btn-gold" href="<?php echo esc_url(home_url('/donate')); ?>">Donate</a>
        <a class="wm-btn wm-btn-ghost" href="<?php echo warriors_modern_hq_url('/register'); ?>">Join</a>
        <a class="wm-btn wm-btn-dark" href="<?php echo warriors_modern_hq_url('/login'); ?>">Log in</a>
      </div>
    </div>
  </div>
</header>
<main class="wm-main wm-shell">
