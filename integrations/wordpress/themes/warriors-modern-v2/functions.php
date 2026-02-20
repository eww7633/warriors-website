<?php
if (!defined('ABSPATH')) {
    exit;
}

function warriors_modern_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script']);
    register_nav_menus([
        'primary' => __('Primary Menu', 'warriors-modern-v2'),
    ]);
}
add_action('after_setup_theme', 'warriors_modern_setup');

function warriors_modern_assets() {
    wp_enqueue_style('warriors-modern-v2-style', get_stylesheet_uri(), [], '2.0.1');
    wp_enqueue_script(
        'warriors-modern-v2-nav',
        get_template_directory_uri() . '/assets/js/navigation.js',
        [],
        '2.0.1',
        true
    );
}
add_action('wp_enqueue_scripts', 'warriors_modern_assets');

function warriors_modern_options() {
    $default = [
        'hq_base' => 'https://hq.pghwarriorhockey.us',
    ];
    $saved = get_option('warriors_theme_tools_options', []);
    if (!is_array($saved)) {
        $saved = [];
    }
    return wp_parse_args($saved, $default);
}

function warriors_modern_public_events($limit = 4) {
    $opts = warriors_modern_options();
    $feed = untrailingslashit($opts['hq_base']) . '/api/public/events';

    $response = wp_remote_get($feed, [
        'timeout' => 10,
        'headers' => ['Accept' => 'application/json'],
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

function warriors_modern_event_url($event) {
    $opts = warriors_modern_options();
    $base = untrailingslashit($opts['hq_base']);
    if (!empty($event['eventUrl'])) {
        return esc_url($event['eventUrl']);
    }
    $id = sanitize_text_field($event['id'] ?? '');
    if ($id === '') {
        return esc_url($base . '/calendar');
    }
    return esc_url($base . '/calendar?event=' . rawurlencode($id));
}

function warriors_modern_hq_url($path) {
    $opts = warriors_modern_options();
    return esc_url(untrailingslashit($opts['hq_base']) . $path);
}

function warriors_modern_social_url($platform) {
    $defaults = [
        'instagram_url' => 'https://instagram.com/pittsburghwarriorshockey',
        'facebook_url' => 'https://www.facebook.com/pittsburghwarriors/',
    ];
    $opts = get_option('warriors_theme_tools_options', []);
    if (!is_array($opts)) {
        $opts = [];
    }

    if ($platform === 'instagram') {
        return esc_url($opts['instagram_url'] ?? $defaults['instagram_url']);
    }
    if ($platform === 'facebook') {
        return esc_url($opts['facebook_url'] ?? $defaults['facebook_url']);
    }
    return '#';
}
