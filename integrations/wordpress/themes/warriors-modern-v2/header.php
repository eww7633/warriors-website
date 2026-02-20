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
        <div class="wm-social" aria-label="Social links">
          <a class="wm-icon-btn" href="<?php echo warriors_modern_social_url('instagram'); ?>" target="_blank" rel="noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="4" width="16" height="16" rx="5" ry="5"></rect>
              <circle cx="12" cy="12" r="3.5"></circle>
              <circle cx="17.4" cy="6.6" r="1"></circle>
            </svg>
          </a>
          <a class="wm-icon-btn" href="<?php echo warriors_modern_social_url('facebook'); ?>" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9c0-.7.3-1 1-1z"></path>
            </svg>
          </a>
        </div>
        <button class="wm-btn wm-btn-ghost wm-theme-toggle" type="button" aria-pressed="false">Dark</button>
        <a class="wm-btn wm-btn-gold" href="<?php echo esc_url(home_url('/donate')); ?>">Donate</a>
        <a class="wm-btn wm-btn-ghost" href="<?php echo warriors_modern_hq_url('/register'); ?>">Join</a>
        <a class="wm-btn wm-btn-dark" href="<?php echo warriors_modern_hq_url('/login'); ?>">Log in</a>
      </div>
    </div>
  </div>
</header>
<main class="wm-main wm-shell">
