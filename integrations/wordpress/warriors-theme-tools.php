<?php
/**
 * Plugin Name: Warriors Theme Tools
 * Description: Brand styling and HQ navigation/link integration for the Pittsburgh Warriors WordPress site.
 * Version: 0.2.0
 */

if (!defined('ABSPATH')) {
    exit;
}

function warriors_theme_tools_defaults() {
    return [
        'hq_base_url' => 'https://hq.pghwarriorhockey.us',
        'instagram_url' => 'https://instagram.com/pittsburghwarriorshockey',
        'facebook_url' => 'https://www.facebook.com/pittsburghwarriors/',
        'inject_frontpage_block' => true,
    ];
}

function warriors_theme_tools_get_options() {
    $saved = get_option('warriors_theme_tools_options', []);
    if (!is_array($saved)) {
        $saved = [];
    }

    return wp_parse_args($saved, warriors_theme_tools_defaults());
}

function warriors_theme_tools_sanitize($input) {
    $defaults = warriors_theme_tools_defaults();

    return [
        'hq_base_url' => esc_url_raw($input['hq_base_url'] ?? $defaults['hq_base_url']),
        'instagram_url' => esc_url_raw($input['instagram_url'] ?? $defaults['instagram_url']),
        'facebook_url' => esc_url_raw($input['facebook_url'] ?? $defaults['facebook_url']),
        'inject_frontpage_block' => !empty($input['inject_frontpage_block']),
    ];
}

function warriors_theme_tools_enqueue_assets() {
    $opts = warriors_theme_tools_get_options();

    $css = '
:root {
  --warriors-black: #11161d;
  --warriors-gold: #ffc72c;
  --warriors-gunmetal: #2f343d;
  --warriors-cream: #f3efe6;
  --warriors-link: #0f4f78;
}
body {
  background: var(--warriors-cream);
}
.site, #page {
  background: linear-gradient(180deg, #f6f2ea 0%, #efe9dc 100%);
}
header, .site-header, .main-navigation, .wp-block-navigation {
  background: var(--warriors-black);
}
header a, .site-header a, .main-navigation a, .wp-block-navigation a {
  color: #f4f1eb !important;
  font-weight: 600;
}
header a:hover, .site-header a:hover, .main-navigation a:hover, .wp-block-navigation a:hover {
  color: var(--warriors-gold) !important;
}
.warriors-theme-tools-cta,
.wp-block-button__link,
button,
input[type="submit"] {
  border-radius: 10px;
  border: 1px solid #9b7711;
  background: var(--warriors-gold);
  color: #11161d;
  font-weight: 700;
}
.warriors-theme-tools-cta.alt {
  background: var(--warriors-black);
  border-color: var(--warriors-black);
  color: #ffffff;
}
.warriors-theme-tools-banner {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin: 1rem 0;
}
.warriors-theme-tools-card {
  border: 1px solid #d7c69a;
  border-radius: 14px;
  background: #fff;
  padding: 1rem;
  box-shadow: 0 8px 20px rgba(17,22,29,0.08);
}
.warriors-theme-tools-social {
  display: flex;
  gap: 0.85rem;
  align-items: center;
}
.warriors-theme-tools-social a {
  color: var(--warriors-link);
  font-weight: 700;
}
.warriors-home-updates {
  border: 1px solid #d7c69a;
  border-radius: 14px;
  background: #fff;
  padding: 1rem;
  margin: 1rem 0;
  box-shadow: 0 8px 20px rgba(17,22,29,0.08);
}
.warriors-home-updates h2 {
  margin-top: 0;
}
.warriors-home-updates ul {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}
.warriors-home-updates .meta {
  color: #4f5763;
  font-size: 0.95rem;
}
';

    wp_register_style('warriors-theme-tools-inline', false);
    wp_enqueue_style('warriors-theme-tools-inline');
    wp_add_inline_style('warriors-theme-tools-inline', $css);

    $js = 'window.WARRIORS_HQ_BASE = ' . wp_json_encode(untrailingslashit($opts['hq_base_url'])) . ';';
    wp_register_script('warriors-theme-tools-inline', false, [], null, true);
    wp_enqueue_script('warriors-theme-tools-inline');
    wp_add_inline_script('warriors-theme-tools-inline', $js, 'before');
}
add_action('wp_enqueue_scripts', 'warriors_theme_tools_enqueue_assets');

function warriors_theme_tools_normalize_menu_url($item, $hq_base_url) {
    $title = strtolower(trim(wp_strip_all_tags($item->title)));

    if (in_array($title, ['log in', 'login', 'sign in'], true)) {
        $item->url = $hq_base_url . '/login';
    }

    if (in_array($title, ['sign up', 'join', 'register'], true)) {
        $item->url = $hq_base_url . '/register';
    }

    if (in_array($title, ['warrior hq', 'my account', 'hq'], true)) {
        $item->url = $hq_base_url . '/player';
    }

    return $item;
}

function warriors_theme_tools_patch_menu_links($items) {
    $opts = warriors_theme_tools_get_options();
    $hq = untrailingslashit($opts['hq_base_url']);

    foreach ($items as $index => $item) {
        $items[$index] = warriors_theme_tools_normalize_menu_url($item, $hq);
    }

    return $items;
}
add_filter('wp_nav_menu_objects', 'warriors_theme_tools_patch_menu_links', 20, 1);

function warriors_theme_tools_hq_cta_shortcode() {
    $opts = warriors_theme_tools_get_options();
    $hq = untrailingslashit($opts['hq_base_url']);

    return '<div class="warriors-theme-tools-banner">'
        . '<a class="warriors-theme-tools-cta alt" href="' . esc_url($hq . '/login') . '">Player Login</a>'
        . '<a class="warriors-theme-tools-cta" href="' . esc_url($hq . '/register') . '">Request Player Access</a>'
        . '<a class="warriors-theme-tools-cta" href="' . esc_url($hq . '/calendar') . '">View Events</a>'
        . '</div>';
}
add_shortcode('warriors_hq_cta', 'warriors_theme_tools_hq_cta_shortcode');

function warriors_theme_tools_social_shortcode() {
    $opts = warriors_theme_tools_get_options();

    return '<div class="warriors-theme-tools-social">'
        . '<a href="' . esc_url($opts['instagram_url']) . '" target="_blank" rel="noreferrer">Instagram</a>'
        . '<a href="' . esc_url($opts['facebook_url']) . '" target="_blank" rel="noreferrer">Facebook</a>'
        . '</div>';
}
add_shortcode('warriors_social_links', 'warriors_theme_tools_social_shortcode');

function warriors_theme_tools_fetch_public_events($feed_url, $limit = 3) {
    $response = wp_remote_get($feed_url, [
        'timeout' => 10,
        'headers' => ['Accept' => 'application/json']
    ]);

    if (is_wp_error($response)) {
        return [];
    }

    $status = wp_remote_retrieve_response_code($response);
    if ($status < 200 || $status >= 300) {
        return [];
    }

    $data = json_decode(wp_remote_retrieve_body($response), true);
    if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
        return [];
    }

    return array_slice($data['items'], 0, max(1, intval($limit)));
}

function warriors_theme_tools_home_updates_shortcode() {
    $opts = warriors_theme_tools_get_options();
    $hq = untrailingslashit($opts['hq_base_url']);
    $events = warriors_theme_tools_fetch_public_events($hq . '/api/public/events', 3);

    $html = '<section class="warriors-home-updates">';
    $html .= '<h2>Latest Warriors Updates</h2>';
    $html .= '<p class="meta">Live event snapshots and direct player access to Warrior HQ.</p>';
    $html .= warriors_theme_tools_hq_cta_shortcode();

    if (count($events) > 0) {
        $html .= '<ul>';
        foreach ($events as $event) {
            $title = esc_html($event['title'] ?? 'Event');
            $date = !empty($event['startsAt'])
                ? esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($event['startsAt'])))
                : 'TBD';
            $html .= '<li><strong>' . $title . '</strong> <span class="meta">(' . $date . ')</span></li>';
        }
        $html .= '</ul>';
    } else {
        $html .= '<p>No upcoming events available right now.</p>';
    }

    $html .= '</section>';

    return $html;
}
add_shortcode('warriors_home_updates', 'warriors_theme_tools_home_updates_shortcode');

function warriors_theme_tools_inject_frontpage_content($content) {
    if (is_admin() || !is_main_query() || !is_singular()) {
        return $content;
    }

    if (!is_front_page()) {
        return $content;
    }

    $opts = warriors_theme_tools_get_options();
    if (empty($opts['inject_frontpage_block'])) {
        return $content;
    }

    if (has_shortcode($content, 'warriors_home_updates')) {
        return $content;
    }

    return warriors_theme_tools_home_updates_shortcode() . $content;
}
add_filter('the_content', 'warriors_theme_tools_inject_frontpage_content', 8);

function warriors_theme_tools_register_settings() {
    register_setting('warriors_theme_tools_settings', 'warriors_theme_tools_options', 'warriors_theme_tools_sanitize');
}
add_action('admin_init', 'warriors_theme_tools_register_settings');

function warriors_theme_tools_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $opts = warriors_theme_tools_get_options();
    ?>
    <div class="wrap">
        <h1>Warriors Theme Tools</h1>
        <form method="post" action="options.php">
            <?php settings_fields('warriors_theme_tools_settings'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="wtt_hq_base_url">HQ Base URL</label></th>
                    <td><input id="wtt_hq_base_url" name="warriors_theme_tools_options[hq_base_url]" type="url" class="regular-text" value="<?php echo esc_attr($opts['hq_base_url']); ?>" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="wtt_ig">Instagram URL</label></th>
                    <td><input id="wtt_ig" name="warriors_theme_tools_options[instagram_url]" type="url" class="regular-text" value="<?php echo esc_attr($opts['instagram_url']); ?>" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="wtt_fb">Facebook URL</label></th>
                    <td><input id="wtt_fb" name="warriors_theme_tools_options[facebook_url]" type="url" class="regular-text" value="<?php echo esc_attr($opts['facebook_url']); ?>" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="wtt_inject">Inject Homepage Updates Block</label></th>
                    <td><label><input id="wtt_inject" name="warriors_theme_tools_options[inject_frontpage_block]" type="checkbox" <?php checked(!empty($opts['inject_frontpage_block'])); ?> /> Auto-insert updates block on front page</label></td>
                </tr>
            </table>
            <?php submit_button('Save Settings'); ?>
        </form>
        <p>Shortcodes:</p>
        <p><code>[warriors_hq_cta]</code></p>
        <p><code>[warriors_social_links]</code></p>
        <p><code>[warriors_home_updates]</code></p>
    </div>
    <?php
}

function warriors_theme_tools_admin_menu() {
    add_options_page(
        'Warriors Theme Tools',
        'Warriors Theme Tools',
        'manage_options',
        'warriors-theme-tools',
        'warriors_theme_tools_settings_page'
    );
}
add_action('admin_menu', 'warriors_theme_tools_admin_menu');
