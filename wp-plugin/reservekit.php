<?php
/**
 * Plugin Name:  ReserveKit
 * Plugin URI:   https://github.com/your-org/reservekit
 * Description:  Embeds the ReserveKit reservation widget via shortcode.
 * Version:      1.0.0
 * Requires PHP: 7.4
 */

defined('ABSPATH') || exit;

// ── Helpers ───────────────────────────────────────────────────────────────────

function reservekit_api_base(): string {
    return defined('RESERVEKIT_API_URL')
        ? rtrim(RESERVEKIT_API_URL, '/')
        : rtrim((string) get_option('reservekit_api_url', 'http://localhost:3000'), '/');
}

// ── Assets ────────────────────────────────────────────────────────────────────

add_action('wp_enqueue_scripts', function (): void {
    wp_enqueue_script(
        'reservekit',
        plugin_dir_url(__FILE__) . 'reservekit.js',
        [],
        '1.0.0',
        true  // load in footer
    );
    wp_localize_script('reservekit', 'reservekitConfig', [
        'apiBase' => reservekit_api_base(),
    ]);
});

// ── Shortcode ─────────────────────────────────────────────────────────────────

add_shortcode('reservekit', 'reservekit_shortcode');

/**
 * [reservekit event_id="1"]
 *
 * Fetches tiers from the Node API and renders the reservation form.
 * Form submission is handled by reservekit.js.
 */
function reservekit_shortcode(array $atts): string {
    $atts     = shortcode_atts(['event_id' => ''], $atts, 'reservekit');
    $event_id = absint($atts['event_id']);

    if (!$event_id) {
        return '<p class="reservekit-error">Missing event_id attribute.</p>';
    }

    $response = wp_remote_get(reservekit_api_base() . "/api/events/{$event_id}/tiers");
    if (is_wp_error($response)) {
        return '<p class="reservekit-error">Could not load ticket tiers.</p>';
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($body['data'])) {
        return '<p class="reservekit-error">No tiers available for this event.</p>';
    }

    $tiers = $body['data'];

    ob_start();
    ?>
    <div class="reservekit-widget" data-event="<?php echo esc_attr($event_id); ?>">
        <form id="reservekit-form-<?php echo esc_attr($event_id); ?>"
              class="reservekit-form"
              data-event-id="<?php echo esc_attr($event_id); ?>">

            <label for="rk-tier-<?php echo esc_attr($event_id); ?>">Select a tier</label>
            <select id="rk-tier-<?php echo esc_attr($event_id); ?>" name="tier_id" required>
                <?php foreach ($tiers as $tier):
                    $available = max(0, (int) $tier['capacity'] - (int) $tier['sold_count']);
                    $price     = number_format((float) $tier['price'], 2);
                ?>
                    <option value="<?php echo esc_attr($tier['id']); ?>"
                        <?php disabled($available, 0); ?>>
                        <?php echo esc_html($tier['name']); ?>
                        — $<?php echo esc_html($price); ?>
                        (<?php echo $available > 0 ? esc_html($available) . ' left' : 'sold out'; ?>)
                    </option>
                <?php endforeach; ?>
            </select>

            <button type="submit">Reserve</button>
        </form>
        <div class="reservekit-message"
             id="reservekit-msg-<?php echo esc_attr($event_id); ?>"></div>
    </div>
    <?php
    return ob_get_clean();
}

// ── Settings page ─────────────────────────────────────────────────────────────

add_action('admin_menu', function (): void {
    add_options_page(
        'ReserveKit',
        'ReserveKit',
        'manage_options',
        'reservekit',
        'reservekit_settings_page'
    );
});

function reservekit_settings_page(): void {
    if (!current_user_can('manage_options')) return;

    if (isset($_POST['reservekit_api_url'])) {
        check_admin_referer('reservekit_settings');
        update_option('reservekit_api_url', esc_url_raw($_POST['reservekit_api_url']));
        echo '<div class="updated"><p>Saved.</p></div>';
    }

    $url = esc_attr(get_option('reservekit_api_url', 'http://localhost:3000'));
    ?>
    <div class="wrap">
        <h1>ReserveKit Settings</h1>
        <form method="post">
            <?php wp_nonce_field('reservekit_settings'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row">API URL</th>
                    <td>
                        <input type="url" name="reservekit_api_url"
                               value="<?php echo $url; ?>" class="regular-text">
                        <p class="description">
                            Base URL of the ReserveKit Node API, e.g.
                            <code>https://api.yourdomain.com</code>
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
