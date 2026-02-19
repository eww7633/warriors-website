<?php
/**
 * Plugin Name: Warriors Public Events Feed
 * Description: Pulls public events from the Warriors HQ API and renders them via shortcode.
 * Version: 0.2.0
 */

if (!defined('ABSPATH')) {
    exit;
}

function warriors_public_events_default_options() {
    return [
        'feed_url' => 'https://hq.pghwarriorhockey.us/api/public/events',
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
        'limit' => $options['limit'],
        'title' => $options['title']
    ], $atts, 'warriors_public_events');

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
        <div class="warriors-public-events-grid">
            <?php foreach ($items as $event): ?>
                <article class="warriors-public-events-card">
                    <h3><?php echo esc_html($event['title'] ?? 'Event'); ?></h3>
                    <p class="warriors-public-events-meta">
                        <?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($event['startsAt'] ?? ''))); ?>
                    </p>
                    <?php if (!empty($event['location'])): ?>
                        <p class="warriors-public-events-location"><?php echo esc_html($event['location']); ?></p>
                    <?php endif; ?>
                    <p><?php echo esc_html($event['publicDetails'] ?? ''); ?></p>
                </article>
            <?php endforeach; ?>
        </div>
    </section>
    <?php

    return ob_get_clean();
}

add_shortcode('warriors_public_events', 'warriors_render_public_events_shortcode');

function warriors_public_events_enqueue_styles() {
    $css = '.warriors-public-events{margin:1rem 0}.warriors-public-events h2{font-size:1.75rem;margin:0 0 0.8rem;color:#1d2128}.warriors-public-events-grid{display:grid;gap:0.8rem;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.warriors-public-events-card{border:1px solid #d4d8de;border-radius:12px;background:#fff;padding:0.9rem;box-shadow:0 8px 18px -16px rgba(0,0,0,.45)}.warriors-public-events-card h3{margin:0 0 .45rem;color:#11161d;font-size:1.05rem}.warriors-public-events-meta{margin:0 0 .25rem;color:#a9770e;font-weight:700}.warriors-public-events-location{margin:0 0 .4rem;color:#404754;font-size:.95rem}';
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
