<?php
/**
 * Plugin Name: Warriors Public Events Feed
 * Description: Pulls public events from the Warriors HQ API and renders them via shortcode.
 * Version: 0.3.4
 */

if (!defined('ABSPATH')) {
    exit;
}

function warriors_public_events_default_options() {
    return [
        'feed_url' => 'https://hq.pghwarriorhockey.us/api/public/events',
        'hq_base_url' => 'https://hq.pghwarriorhockey.us',
        'limit' => 10,
        'title' => 'Upcoming Events',
        'cache_minutes' => 10
    ];
}

function warriors_public_events_get_options() {
    $saved = get_option('warriors_public_events_options', []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return wp_parse_args($saved, warriors_public_events_default_options());
}

function warriors_public_events_sanitize_options($input) {
    $defaults = warriors_public_events_default_options();

    return [
        'feed_url' => esc_url_raw($input['feed_url'] ?? $defaults['feed_url']),
        'hq_base_url' => esc_url_raw($input['hq_base_url'] ?? $defaults['hq_base_url']),
        'limit' => max(1, min(50, intval($input['limit'] ?? $defaults['limit']))),
        'title' => sanitize_text_field($input['title'] ?? $defaults['title']),
        'cache_minutes' => max(1, min(120, intval($input['cache_minutes'] ?? $defaults['cache_minutes'])))
    ];
}

function warriors_public_events_fetch_items($feed_url, $cache_minutes) {
    $cache_key = 'warriors_public_events_' . md5($feed_url);
    $cached = get_transient($cache_key);
    if (is_array($cached)) {
        return $cached;
    }

    $response = wp_remote_get($feed_url, [
        'timeout' => 10,
        'headers' => [
            'Accept' => 'application/json'
        ]
    ]);

    if (is_wp_error($response)) {
        return new WP_Error('feed_request_failed', 'Unable to load events right now.');
    }

    $status = wp_remote_retrieve_response_code($response);
    if ($status < 200 || $status >= 300) {
        return new WP_Error('feed_http_error', 'Unable to load events right now.');
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
        return [];
    }

    set_transient($cache_key, $data['items'], max(60, $cache_minutes * MINUTE_IN_SECONDS));
    return $data['items'];
}

function warriors_render_public_events_shortcode($atts) {
    $options = warriors_public_events_get_options();
    $atts = shortcode_atts([
        'feed_url' => $options['feed_url'],
        'hq_base_url' => $options['hq_base_url'],
        'limit' => $options['limit'],
        'title' => $options['title']
    ], $atts, 'warriors_public_events');
    $hq_base_url = untrailingslashit($atts['hq_base_url']);
    $login_url = $hq_base_url . '/login';
    $register_url = $hq_base_url . '/register';
    $player_url = $hq_base_url . '/player';
    $is_logged_in = is_user_logged_in();

    $items = warriors_public_events_fetch_items($atts['feed_url'], $options['cache_minutes']);
    if (is_wp_error($items)) {
        return '<p>Unable to load events right now.</p>';
    }

    $items = array_slice($items, 0, max(1, intval($atts['limit'])));

    if (count($items) === 0) {
        return '<p>No upcoming events at this time.</p>';
    }

    ob_start();
    ?>
    <section class="warriors-public-events">
        <h2><?php echo esc_html($atts['title']); ?></h2>
        <p class="intro">Tap any event card to open the full Warrior HQ details and RSVP/signup flow.</p>
        <div class="warriors-public-events-cta">
            <?php if ($is_logged_in): ?>
                <a class="warriors-public-events-button alt" href="<?php echo esc_url($player_url); ?>">Open Player Dashboard</a>
                <a class="warriors-public-events-button" href="<?php echo esc_url($hq_base_url . '/calendar'); ?>">View Full Calendar</a>
            <?php else: ?>
                <a class="warriors-public-events-button alt" href="<?php echo esc_url($login_url); ?>">Player Login</a>
                <a class="warriors-public-events-button" href="<?php echo esc_url($register_url); ?>">Request Player Access</a>
            <?php endif; ?>
        </div>
        <div class="warriors-public-events-grid">
            <?php foreach ($items as $event): ?>
                <?php
                    $event_id = sanitize_text_field($event['id'] ?? '');
                    $event_url = !empty($event['eventUrl'])
                        ? esc_url_raw($event['eventUrl'])
                        : $hq_base_url . '/calendar' . (!empty($event_id) ? ('?event=' . rawurlencode($event_id)) : '');
                    $starts_at = !empty($event['startsAt']) ? strtotime($event['startsAt']) : false;
                ?>
                <article class="warriors-public-events-card">
                    <a class="warriors-public-events-stretched-link" href="<?php echo esc_url($event_url); ?>" aria-label="Open <?php echo esc_attr($event['title'] ?? 'event'); ?> in Warrior HQ"></a>
                    <h3><?php echo esc_html($event['title'] ?? 'Event'); ?></h3>
                    <p class="warriors-public-events-meta">
                        <?php echo $starts_at ? esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), $starts_at)) : 'TBD'; ?>
                    </p>
                    <?php if (!empty($event['location'])): ?>
                        <p class="warriors-public-events-location"><?php echo esc_html($event['location']); ?></p>
                    <?php endif; ?>
                    <?php if (!empty($event['eventType'])): ?>
                        <p class="warriors-public-events-type"><?php echo esc_html($event['eventType']); ?></p>
                    <?php endif; ?>
                    <p><?php echo esc_html($event['publicDetails'] ?? ''); ?></p>
                    <p class="warriors-public-events-open">Open Event Details & RSVP</p>
                    <?php if (!empty($event['locationMapUrl'])): ?>
                        <p><a class="warriors-public-events-link warriors-public-events-map-link" href="<?php echo esc_url($event['locationMapUrl']); ?>" target="_blank" rel="noreferrer">View Map</a></p>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>
    </section>
    <?php

    return ob_get_clean();
}

add_shortcode('warriors_public_events', 'warriors_render_public_events_shortcode');

function warriors_public_events_enqueue_styles() {
    $css = '
.warriors-public-events{margin:1rem 0}
.warriors-public-events h2{font-size:1.82rem;margin:0 0 .35rem;color:#10141b;line-height:1.2}
.warriors-public-events .intro{margin:0 0 .9rem;color:#3a4350}
.warriors-public-events-cta{display:flex;gap:.65rem;flex-wrap:wrap;margin:0 0 1rem}
.warriors-public-events-button{display:inline-block;padding:.58rem .95rem;border-radius:10px;background:linear-gradient(180deg,#ffd866 0%,#ffcc33 100%);color:#11161d;text-decoration:none;font-weight:800;border:1px solid #c99d1e;box-shadow:0 7px 16px rgba(0,0,0,.14)}
.warriors-public-events-button.alt{background:linear-gradient(180deg,#1c2532 0%,#11161d 100%);color:#fff;border-color:#11161d}
.warriors-public-events-grid{display:grid;gap:.86rem;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.warriors-public-events-card{position:relative;border:1px solid #d9c8a0;border-radius:14px;background:linear-gradient(180deg,#fffdf8 0%,#f4ecdc 100%);padding:.92rem;box-shadow:0 10px 20px -16px rgba(0,0,0,.45);transition:transform .16s ease,box-shadow .16s ease}
.warriors-public-events-card:hover{transform:translateY(-2px);box-shadow:0 16px 28px -18px rgba(0,0,0,.55)}
.warriors-public-events-card:focus-within{outline:2px solid #ffcc33;outline-offset:2px}
.warriors-public-events-stretched-link{position:absolute;inset:0;border-radius:14px;z-index:1}
.warriors-public-events-card h3,.warriors-public-events-card p{position:relative;z-index:2}
.warriors-public-events-card h3{margin:0 0 .45rem;color:#10141b;font-size:1.08rem;line-height:1.3}
.warriors-public-events-meta{margin:0 0 .25rem;color:#8d670f;font-weight:800}
.warriors-public-events-location{margin:0 0 .2rem;color:#38414e;font-size:.95rem}
.warriors-public-events-type{margin:0 0 .4rem;color:#1c232d;font-weight:700}
.warriors-public-events-open{margin:.58rem 0 0;font-weight:900;color:#0d4a74;text-decoration:underline}
.warriors-public-events-open:after{content:\"  ->\"}
.warriors-public-events-link{font-weight:700;color:#0d4a74;text-decoration:underline}
.warriors-public-events-map-link{position:relative;z-index:3}
@media (prefers-color-scheme: dark) {
  .warriors-public-events h2,
  .warriors-public-events .intro {
    color: #eef2f8;
  }
  .warriors-public-events-card {
    background: linear-gradient(180deg,#1a2330 0%,#212d3d 100%);
    border-color: #39485d;
  }
  .warriors-public-events-card h3 {
    color: #f4f7fb;
  }
  .warriors-public-events-meta {
    color: #ffd978;
  }
  .warriors-public-events-location,
  .warriors-public-events-type,
  .warriors-public-events-card p {
    color: #d9e1ee;
  }
  .warriors-public-events-open,
  .warriors-public-events-link {
    color: #8dc8ff;
  }
}
html[class*="dark"] .warriors-public-events h2,
html[class*="dark"] .warriors-public-events .intro,
body.dark-mode .warriors-public-events h2,
body.dark-mode .warriors-public-events .intro,
body[data-theme="dark"] .warriors-public-events h2,
body[data-theme="dark"] .warriors-public-events .intro,
body.is-style-dark .warriors-public-events h2,
body.is-style-dark .warriors-public-events .intro,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events h2,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events .intro {
  color: #eef2f8;
}
html[class*="dark"] .warriors-public-events-card,
body.dark-mode .warriors-public-events-card,
body[data-theme="dark"] .warriors-public-events-card,
body.is-style-dark .warriors-public-events-card,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events-card {
  background: linear-gradient(180deg,#1a2330 0%,#212d3d 100%);
  border-color: #39485d;
}
html[class*="dark"] .warriors-public-events-card h3,
body.dark-mode .warriors-public-events-card h3,
body[data-theme="dark"] .warriors-public-events-card h3,
body.is-style-dark .warriors-public-events-card h3,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events-card h3 {
  color: #f4f7fb;
}
html[class*="dark"] .warriors-public-events-meta,
body.dark-mode .warriors-public-events-meta,
body[data-theme="dark"] .warriors-public-events-meta,
body.is-style-dark .warriors-public-events-meta,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events-meta {
  color: #ffd978;
}
html[class*="dark"] .warriors-public-events-location,
html[class*="dark"] .warriors-public-events-type,
html[class*="dark"] .warriors-public-events-card p,
body.dark-mode .warriors-public-events-location,
body.dark-mode .warriors-public-events-type,
body.dark-mode .warriors-public-events-card p,
body[data-theme="dark"] .warriors-public-events-location,
body[data-theme="dark"] .warriors-public-events-type,
body[data-theme="dark"] .warriors-public-events-card p,
body.is-style-dark .warriors-public-events-location,
body.is-style-dark .warriors-public-events-type,
body.is-style-dark .warriors-public-events-card p,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events-location,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events-type,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events-card p {
  color: #d9e1ee;
}
html[class*="dark"] .warriors-public-events-open,
html[class*="dark"] .warriors-public-events-link,
body.dark-mode .warriors-public-events-open,
body.dark-mode .warriors-public-events-link,
body[data-theme="dark"] .warriors-public-events-open,
body[data-theme="dark"] .warriors-public-events-link,
body.is-style-dark .warriors-public-events-open,
body.is-style-dark .warriors-public-events-link,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events-open,
body.default-mode-dark:not(.is-style-light):not(.is-style-system) .warriors-public-events-link {
  color: #8dc8ff;
}
';
    wp_register_style('warriors-public-events-inline', false);
    wp_enqueue_style('warriors-public-events-inline');
    wp_add_inline_style('warriors-public-events-inline', $css);
}
add_action('wp_enqueue_scripts', 'warriors_public_events_enqueue_styles');

function warriors_public_events_register_settings() {
    register_setting(
        'warriors_public_events_settings',
        'warriors_public_events_options',
        'warriors_public_events_sanitize_options'
    );
}
add_action('admin_init', 'warriors_public_events_register_settings');

function warriors_public_events_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $opts = warriors_public_events_get_options();
    ?>
    <div class="wrap">
        <h1>Warriors Public Events Feed</h1>
        <form method="post" action="options.php">
            <?php settings_fields('warriors_public_events_settings'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="wpe_feed_url">Feed URL</label></th>
                    <td><input id="wpe_feed_url" name="warriors_public_events_options[feed_url]" type="url" class="regular-text" value="<?php echo esc_attr($opts['feed_url']); ?>" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="wpe_hq_base_url">HQ Base URL</label></th>
                    <td><input id="wpe_hq_base_url" name="warriors_public_events_options[hq_base_url]" type="url" class="regular-text" value="<?php echo esc_attr($opts['hq_base_url']); ?>" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="wpe_title">Default Title</label></th>
                    <td><input id="wpe_title" name="warriors_public_events_options[title]" type="text" class="regular-text" value="<?php echo esc_attr($opts['title']); ?>" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="wpe_limit">Default Limit</label></th>
                    <td><input id="wpe_limit" name="warriors_public_events_options[limit]" type="number" min="1" max="50" value="<?php echo esc_attr($opts['limit']); ?>" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="wpe_cache">Cache Minutes</label></th>
                    <td><input id="wpe_cache" name="warriors_public_events_options[cache_minutes]" type="number" min="1" max="120" value="<?php echo esc_attr($opts['cache_minutes']); ?>" /></td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
        <p>Shortcode example: <code>[warriors_public_events]</code></p>
        <p>Override example: <code>[warriors_public_events limit="6" title="Upcoming Warriors Events"]</code></p>
    </div>
    <?php
}

function warriors_public_events_admin_menu() {
    add_options_page(
        'Warriors Public Events',
        'Warriors Events Feed',
        'manage_options',
        'warriors-public-events',
        'warriors_public_events_settings_page'
    );
}
add_action('admin_menu', 'warriors_public_events_admin_menu');
