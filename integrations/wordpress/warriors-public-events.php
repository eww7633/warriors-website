<?php
/**
 * Plugin Name: Warriors Public Events Feed
 * Description: Pulls public events from the Warriors HQ API and renders them via shortcode.
 * Version: 0.1.0
 */

if (!defined('ABSPATH')) {
    exit;
}

function warriors_render_public_events_shortcode($atts) {
    $atts = shortcode_atts([
        'feed_url' => 'https://hq.pghwarriorhockey.us/api/public/events',
        'limit' => 10,
        'title' => 'Upcoming Events'
    ], $atts, 'warriors_public_events');

    $response = wp_remote_get($atts['feed_url'], [
        'timeout' => 10,
        'headers' => [
            'Accept' => 'application/json'
        ]
    ]);

    if (is_wp_error($response)) {
        return '<p>Unable to load events right now.</p>';
    }

    $status = wp_remote_retrieve_response_code($response);
    if ($status < 200 || $status >= 300) {
        return '<p>Unable to load events right now.</p>';
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if (!is_array($data) || !isset($data['items']) || !is_array($data['items'])) {
        return '<p>No events available.</p>';
    }

    $items = array_slice($data['items'], 0, max(1, intval($atts['limit'])));

    if (count($items) === 0) {
        return '<p>No upcoming events at this time.</p>';
    }

    ob_start();
    ?>
    <section class="warriors-public-events">
        <h2><?php echo esc_html($atts['title']); ?></h2>
        <ul>
            <?php foreach ($items as $event): ?>
                <li>
                    <strong><?php echo esc_html($event['title'] ?? 'Event'); ?></strong><br />
                    <span><?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($event['startsAt'] ?? ''))); ?></span><br />
                    <?php if (!empty($event['location'])): ?>
                        <span><?php echo esc_html($event['location']); ?></span><br />
                    <?php endif; ?>
                    <span><?php echo esc_html($event['publicDetails'] ?? ''); ?></span>
                </li>
            <?php endforeach; ?>
        </ul>
    </section>
    <?php

    return ob_get_clean();
}

add_shortcode('warriors_public_events', 'warriors_render_public_events_shortcode');
