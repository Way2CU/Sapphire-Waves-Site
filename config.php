<?php

/**
 * Site Configuration File
 *
 * This file overrides properties defined in main configuration
 * file for Caracal located in `units/config.php`.
 */

use Core\Cache\Type as CacheType;

// document standard
define('_STANDARD', 'html5');
define('_TIMEZONE', 'America/New_York');

define('DEBUG', 1);
// define('SQL_DEBUG', 1);

// separate styles and templates for landing pages
switch ($_SERVER['SERVER_NAME']) {
	default:
	case 'baby.sapphirewaves.com':
		$template_path = $site_path.'landing/baby/templates/';
		$scripts_path = $site_path.'landing/baby/scripts/';
		$styles_path = $site_path.'landing/baby/styles/';
		$images_path = $site_path.'landing/baby/images/';
		break;

	case 'pregnant.sapphirewaves.com':
		$template_path = $site_path.'landing/pregnant/templates/';
		$scripts_path = $site_path.'landing/pregnant/scripts/';
		$styles_path = $site_path.'landing/pregnant/styles/';
		$images_path = $site_path.'landing/pregnant/images/';
		break;
}

// default session options
$session_type = Session::TYPE_BROWSER;

// database
$db_use = true;
$db_type = DatabaseType::MYSQL;
$db_config = array(
		'host' => 'localhost',
		'user' => 'root',
		'pass' => 'caracal',
		'name' => 'web_engine'
	);

// configure code generation
$cache_method = CacheType::NONE;
$optimize_code = false;
$url_rewrite = false;

?>
