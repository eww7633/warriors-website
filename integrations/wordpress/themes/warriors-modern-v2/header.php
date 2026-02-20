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
            <button class="wm-sub-toggle" type="button" aria-expanded="false" aria-label="Toggle About subpages">▾</button>
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
          <li><a href="<?php echo warriors_modern_hq_url('/login'); ?>">Log in</a></li>
        </ul>
      </nav>

      <div class="wm-actions">
        <div class="wm-social" aria-label="Social links">
          <a class="wm-icon-btn" href="<?php echo warriors_modern_social_url('instagram'); ?>" target="_blank" rel="noreferrer" aria-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5Zm5.2-2.4a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1Z"></path>
            </svg>
          </a>
          <a class="wm-icon-btn" href="<?php echo warriors_modern_social_url('facebook'); ?>" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13.5 22v-8h2.8l.5-3h-3.3V9.2c0-.9.3-1.5 1.6-1.5H17V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2V11H8v3h2.5v8h3Z"></path>
            </svg>
          </a>
        </div>
        <button class="wm-btn wm-btn-ghost wm-theme-toggle" type="button" aria-pressed="false" aria-label="Toggle dark mode">
          <svg class="wm-theme-icon wm-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4V2m0 20v-2m8-8h2M2 12h2m12.95 6.95 1.41 1.41M5.64 5.64 4.22 4.22m14.14 0-1.41 1.42M5.64 18.36l-1.42 1.41M12 7a5 5 0 1 1-5 5 5 5 0 0 1 5-5Z"/></svg>
          <svg class="wm-theme-icon wm-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 14.2A9 9 0 1 1 9.8 3a7 7 0 1 0 11.2 11.2Z"/></svg>
        </button>
        <a class="wm-btn wm-btn-gold" href="<?php echo esc_url(home_url('/donate')); ?>">Donate</a>
      </div>
    </div>
  </div>
</header>
<main class="wm-main wm-shell">
