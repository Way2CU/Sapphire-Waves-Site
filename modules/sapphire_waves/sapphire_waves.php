<?php

/**
 * Sapphire Waves Module
 *
 * This module provides functionality for widget. It tracks time per user
 * and provides some basic protections against abuse. It heavily relies on
 * the Caracal system for session handling and logging in.
 *
 * Author: Mladen Mijatov
 */
use Core\Module;
use Core\Events as Events;

require_once('units/manager.php');
require_once('units/statistics_manager.php');
require_once('units/trial_manager.php');



class SW_PlanType {
	const FREE = 0;
	const STANDARD = 1;
	const SAPPHIRE = 2;

	public static $type = array(
							'standard' => self::STANDARD,
							'sapphire' => self::SAPPHIRE,
						);

	public static $duration = array(
							'standard' => 15,
							'sapphire' => 0
						);

	public static $unlimited = array(
							'standard' => false,
							'sapphire' => true
						);
}


class sapphire_waves extends Module {
	private static $_instance;
	private $cached_trial_available = null;

	/**
	 * Constructor
	 */
	protected function __construct() {
		global $section;
		
		parent::__construct(__FILE__);

		// register backend
		if (class_exists('backend')) {
			$backend = backend::getInstance();
			Events::connect('backend', 'user-create', 'handleUserCreate', $this);
			Events::connect('backend', 'user-delete', 'handleUserDelete', $this);
		}

		// connect to shop events
		if (class_exists('shop')) {
			$shop = shop::getInstance();
			Events::connect('shop', 'transaction-completed', 'handleTransactionCompleted', $this);

			Events::connect('shop', 'recurring-payment', 'handleRecurringPayment', $this);
			Events::connect('shop', 'recurring-payment-suspended', 'handleRecurringPaymentSuspended', $this);
		}
	}

	/**
	 * Public function that creates a single instance
	 */
	public static function getInstance() {
		if (!isset(self::$_instance))
			self::$_instance = new self();

		return self::$_instance;
	}

	/**
	 * Transfers control to module functions
	 *
	 * @param array $params
	 * @param array $children
	 */
	public function transferControl($params=array(), $children=array()) {
		// global control actions
		if (isset($params['action']))
			switch ($params['action']) {
				case 'get_data':
					$this->getData();
					break;

				case 'save_time':
					$this->saveTime();
					break;

				case 'show_remaining_time':
					$this->showRemainingTime();
					break;

				case 'show_used_time':
					$this->showUsedTime();
					break;

				case 'json_statstics':
					$this->json_getStatistics();
					break;

				default:
					break;
			}

		// global control actions
		if (isset($params['backend_action']))
			switch ($params['backend_action']) {
				default:
					break;
			}
	}

	/**
	 * Event triggered upon module initialization
	 */
	public function onInit() {
		global $db;

		$sql = "
			CREATE TABLE `sapphire_waves` (
				`id` INT NOT NULL AUTO_INCREMENT,
				`user` INT DEFAULT NULL,
				`type` INT DEFAULT NULL,
				`referral` INT DEFAULT NULL,
				`remaining_time` INT DEFAULT NULL,
				`total_time` INT DEFAULT NULL,
				`expires` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				`active` BOOLEAN NOT NULL DEFAULT '1',
				PRIMARY KEY (`id`),
				INDEX (`user`),
				INDEX (`type`),
				INDEX (`referral`)
			) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin AUTO_INCREMENT=0;";
		$db->query($sql);

		$sql = "
			CREATE TABLE `sapphire_waves_statistics` (
				`id` INT NOT NULL AUTO_INCREMENT,
				`user` INT DEFAULT NULL,
				`usage` INT DEFAULT NULL,
				`timestamp` DATE DEFAULT NULL,
				PRIMARY KEY (`id`),
				INDEX `index_by_user` (`user`),
				INDEX `index_for_update` (`user`, `timestamp`)
			) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin AUTO_INCREMENT=0;";
		$db->query($sql);

		$sql = "
			CREATE TABLE `sapphire_waves_trial` (
				`id` INT NOT NULL AUTO_INCREMENT,
				`address` VARCHAR(45) DEFAULT NULL,
				`times_used` INT DEFAULT NULL,
				`timestamp` INT DEFAULT NULL,
				PRIMARY KEY (`id`),
				INDEX `index_by_address` (`address`)
			) ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_bin AUTO_INCREMENT=0;";
		$db->query($sql);

		// trial period
		$this->saveSetting('trial_time', 5);
		$this->saveSetting('trial_period', 7);
	}

	/**
	 * Event triggered upon module deinitialization
	 */
	public function onDisable() {
		global $db;

		$tables = array('sapphire_waves', 'sapphire_waves_statistics', 'sapphire_waves_trial');
		$db->drop_tables($tables);
	}

	/**
	 * Sends data to client application as JSON object.
	 */
	private function getData() {
		global $db;

		$result = array(
				'error'		=> false,
				'message'	=> ''
			);

		if ($_SESSION['logged']) {
			$manager = SapphireWavesManager::getInstance();
			$data = $manager->getSingleItem(
									$manager->getFieldNames(),
									array('user' => $_SESSION['uid'])
								);

			if (is_object($data)) {
				// time expired
				if (strtotime($data->expires) < time()) {
					$manager->updateData(
						array('remaining_time' => 0),
						array('id' => $data->id)
					);

					$data = $manager->getSingleItem(
											$manager->getFieldNames(),
											array('user' => $_SESSION['uid'])
										);
				}

				// populate result with data
				$result['data'] = array(
							'user'				=> $_SESSION['uid'],
							'type'				=> $data->type,
							'remaining_time'	=> strtotime($data->expires) >= time() ? $data->remaining_time : 0,
							'total_time'		=> $data->total_time,
							'active'			=> $data->active
						);

			} else {
				// create free trial for this user
				$trial_time = $this->settings['trial_time'];
				$trial_period = $this->settings['trial_period'];

				$trial_time = $trial_time * 60 * 60;
				$trial_period = time() + ($trial_period * 24 * 60 * 60);

				$data = array(
						'user'				=> $_SESSION['uid'],
						'type'				=> SW_PlanType::FREE,
						'remaining_time'	=> $trial_time,
						'total_time'		=> 0,
						'expires'			=> $db->format_timestamp($trial_period),
						'active'			=> $data->active
					);

				$manager->insertData($data);

				// there's no user on the system, probably payment problem
				$result['data'] = array(
							'user'				=> $_SESSION['uid'],
							'type'				=> $data['type'],
							'remaining_time'	=> $data['remaining_time'],
							'total_time'		=> $data['total_time']
						);
				$result['error'] = true;
				$result['message'] = $this->getLanguageConstant('error_invalid_user');
			}

		} else {
			if (!$this->trialAvailable()) {
				// user is not logged in and no trials remaining
				$result['data'] = array(
						'user'				=> $_SESSION['uid'],
						'type'				=> SW_PlanType::FREE,
						'remaining_time'	=> 0,
						'total_time'		=> 0
					);
				$result['error'] = true;
				$result['message'] = $this->getLanguageConstant('error_not_logged_in');

			} else {
				// trial is available
				$trial_available = true;
				$trial_manager = SapphireWavesTrialManager::getInstance();

				$data = $trial_manager->getSingleItem(
					$trial_manager->getFieldNames(),
					array('address'	=> $_SERVER['REMOTE_ADDR'])
				);

				// record data usage
				if (is_object($data)) {
					$trial_available = $data->times_used <= 2;
					$trial_manager->updateData(
								array(
									'times_used'	=> $data->times_used + 1,
									'timestamp'		=> time()
								),
								array('id' => $data->id)
							);

				} else {
					$trial_manager->insertData(array(
							'address'		=> $_SERVER['REMOTE_ADDR'],
							'times_used'	=> 1,
							'timestamp'		=> time()
						));
				}

				if ($trial_available) {
					$result['data'] = array(
							'user'				=> $_SESSION['uid'],
							'type'				=> SW_PlanType::FREE,
							'remaining_time'	=> 10 * 60, // 10 minutes
							'total_time'		=> 0
						);
					$result['error'] = false;

				} else {
					$result['data'] = array(
							'user'				=> $_SESSION['uid'],
							'type'				=> SW_PlanType::FREE,
							'remaining_time'	=> 0,
							'total_time'		=> 0
						);
					$result['error'] = true;
				}
			}
		}

		print json_encode($result);
	}

	/**
	 * Store time for specified user.
	 */
	private function saveTime() {
		global $db;

		$result = false;

		// sanitize input values
		$used_time = fix_id($_REQUEST['time']);

		if ($_SESSION['logged'] && $used_time > 0) {
			$user_id = $_SESSION['uid'];
			$manager = SapphireWavesManager::getInstance();
			$stats_manager = SapphireWavesStatisticsManager::getInstance();
		
			// get current data
			$data = $manager->getSingleItem(
										$manager->getFieldNames(),
										array('user' => $user_id)
									);

			// at this point there's no reason for missing data
			if (!is_object($data)) {
				print json_encode($result);
				return;
			}

			// update usage statistics
			$stats = $stats_manager->getSingleItem(
										$stats_manager->getFieldNames(),
										array(
											'user'		=> $data->id,
											'timestamp'	=> $db->format_date(time())
										));

			if (is_object($stats)) {
				// update existing statistic
				$stats_manager->updateData(
								array('usage' => $stats->usage + $used_time),
								array('id' => $stats->id)
							);

			} else {
				// add new statistic
				$stats_manager->insertData(array(
								'user'		=> $data->id,
								'usage'		=> $used_time,
								'timestamp'	=> $db->format_date(time())
							));
			}

			// record new time
			$remaining_time = $data->remaining_time - $used_time;
			if ($remaining_time < 0)
				$remaining_time = 0;

			$total_time = $data->total_time + $used_time;

			// update data
			$new_data = array('total_time' => $total_time);
			if ($data->type != SW_PlanType::SAPPHIRE)
				$new_data['remaining_time'] = $remaining_time;

			$manager->updateData($new_data, array('id' => $data->id));

			$result = true;
		}

		print json_encode($result);
	}

	/**
	 * Show remaining time for logged in user.
	 */
	private function showRemainingTime() {
		// make sure we are logged in
		if (!$_SESSION['logged'])
			return;

		$user_id = $_SESSION['uid'];
		$manager = SapphireWavesManager::getInstance();

		// get data for user
		$data = $manager->getSingleItem(
								$manager->getFieldNames(),
								array('user' => $user_id)
							);

		if (is_object($data) && strtotime($data->expires) >= time()) {
			print gmdate('H:i:s', $data->remaining_time);

		} else {
			print '00:00:00';
		}
	}

	/**
	 * Show total time widget has been used.
	 */
	private function showUsedTime() {
		// make sure we are logged in
		if (!$_SESSION['logged'])
			return;

		$user_id = $_SESSION['uid'];
		$manager = SapphireWavesManager::getInstance();

		// get data for user
		$data = $manager->getSingleItem(
								$manager->getFieldNames(),
								array('user' => $user_id)
							);

		if (is_object($data)) {
			print gmdate('z', $data->total_time).'d '.gmdate('H:i:s', $data->total_time);

		} else {
			print '0d 00:00:00';
		}
	}

	/**
	 * Handle completed transaction.
	 *
	 * @param object $transaction
	 */
	public function handleTransactionCompleted($transaction) {
		global $db;

		$manager = SapphireWavesManager::getInstance();
		$plan_manager = ShopTransactionPlansManager::getInstance();

		// get plan
		$plan = $plan_manager->getSingleItem(
									$plan_manager->getFieldNames(),
									array('transaction' => $transaction->id)
								);

		// try get subscription data
		$current_data = $manager->getSingleItem(
				$manager->getFieldNames(),
				array('user' => $transaction->system_user)
			);

		$duration = SW_PlanType::$duration[$plan->plan_name];
		$unlimited = SW_PlanType::$unlimited[$plan->plan_name];
		$expire_timestamp = strtotime('next month', time());

		$data = array(
					'type'		=> SW_PlanType::$type[$plan->plan_name],
					'expires'	=> $db->format_timestamp($expire_timestamp),
					'active'	=> 1
				);


		// add more time to the remaining time
		if (is_object($current_data)) {
			if (!$unlimited)
				$data['remaining_time'] = $current_data->remaining_time + ($duration * 60 * 60); else

			$manager->updateData($data, array('user' => $transaction->system_user));

		} else {
			$data['user'] = $transaction->system_user;
			if (!$unlimited)
				$data['remaining_time'] = $duration * 60 * 60;

			$manager->insertData($data);
		}
	}

	/**
	 * Handle creation of new system user.
	 *
	 * @param object $user
	 */
	public function handleUserCreate($user) {
		global $db;

		$manager = SapphireWavesManager::getInstance();

		// handle new time
		$trial_time = $this->settings['trial_time'];
		$trial_period = $this->settings['trial_period'];

		$trial_time = $trial_time * 60 * 60;
		$trial_period = time() + ($trial_period * 24 * 60 * 60);

		// prepare data
		$data = array(
				'user'				=> $user->id,
				'type'				=> SW_PlanType::FREE,
				'remaining_time'	=> $trial_time,
				'total_time'		=> 0,
				'expires'			=> $db->format_timestamp($trial_period)
			);

		// add referral if specified
		if (isset($_SESSION['sapphire_waves_referral']))
			$data['referral'] = $_SESSION['sapphire_waves_referral'];

		$manager->insertData($data);
	}

	/**
	 * Handle removal of system user.
	 *
	 * @param object $user
	 */
	public function handleUserDelete($user) {
		$manager = SapphireWavesManager::getInstance();
		$manager->deleteData(array('user' => $user->id));
	}

	/**
	 * Handle regular recurring payment.
	 *
	 * @param object $transaction
	 * @param object $plan
	 * @param object $payment
	 */
	public function handleRecurringPayment($transaction, $plan, $payment) {
		global $db;

		$manager = SapphireWavesManager::getInstance();

		// prepare data
		$duration = SW_PlanType::$duration[$plan->plan_name];
		$unlimited = SW_PlanType::$unlimited[$plan->plan_name];
		$expire_timestamp = strtotime('next month', time());

		if ($unlimited) {
			// handle premium plan
			$manager->updateData(
							array(
								'type'		=> SW_PlanType::SAPPHIRE,
								'expires'	=> $db->format_timestamp($expire_timestamp),
								'active'	=> 1
							),
							array(
								'user' => $transaction->system_user
							)
						);

		} else {
			// handle standard plan
			$current_data = $manager->getSingleItem($manager->getFieldNames(), array('user' => $transaction->system_user));
			$data = array(
						'type'		=> SW_PlanType::STANDARD,
						'expires'	=> $db->format_timestamp($expire_timestamp),
						'active'	=> 1
					);

			// add more time to the remaining time
			$data['remaining_time'] = $current_data->remaining_time + ($duration * 60 * 60);

			// update data
			$manager->updateData($data, array('user' => $transaction->system_user));
		}
	}

	/**
	 * Handle recurring payment suspension.
	 * This event happens when there are more than 3 failed payments.
	 *
	 * @param object $transaction
	 * @param object $plan
	 * @param object $payment
	 */
	public function handleRecurringPaymentSuspended($transaction, $plan, $payment) {
		$manager = SapphireWavesManager::getInstance();
		$manager->updateData(array('active' => 0), array('user' => $transaction->system_user));
	}

	/**
	 * Return JSON object containing statistics for currently logged in user.
	 */
	private function json_getStatistics() {
		$result = array();
		$manager = SapphireWavesManager::getInstance();
		$stats_manager = SapphireWavesStatisticsManager::getInstance();

		if ($_SESSION['logged']) {
			$user = $manager->getSingleItem(
									$manager->getFieldNames(),
									array('user' => $_SESSION['uid'])
								);

			if (is_object($user)) {
				$statistics = $stats_manager->getItems(
											$stats_manager->getFieldNames(),
											array('user' => $user->id),
											array('timestamp')
										);

				if (count($statistics) > 0)
					foreach ($statistics as $statistic)
						$result[] = array($statistic->usage, $statistic->timestamp);
			}
		}

		print json_encode($result);
	}

	/**
	 * Check if current user is on free trial.
	 *
	 * @return boolean
	 */
	public function isFreeUser() {
		$manager = SapphireWavesManager::getInstance();
		$result = true;

		if ($_SESSION['logged']) {
			$user = $manager->getSingleItem(
								$manager->getFieldNames(),
								array('user' => $_SESSION['uid'])
							);

			$result = !(is_object($user) && $user->type != SW_PlanType::FREE);
		}

		return $result;
	}

	/**
	 * Check if trial is available for current user.
	 *
	 * @return boolean
	 */
	public function trialAvailable() {
		$result = true;

		// return cached version
		if (!is_null($this->cached_trial_available))
			return $this->cached_trial_available;

		// prepare variables for processing
		$address = $_SERVER['REMOTE_ADDR'];
		$manager = SapphireWavesTrialManager::getInstance();

		// remove old entries
		$manager->deleteData(array(
			'timestamp'	=> array(
					'operator'	=> '<',
					'value'		=> time() - (7 * 24 * 60 * 60)
				)
		));

		// check if we have existing records
		$record = $manager->getSingleItem(
						$manager->getFieldNames(),
						array('address' => $address)
					);

		if (is_object($record))
			$result = ($record->timestamp >= time() - (7 * 24 * 60 * 60)) && $record->times_used <= 2;

		// cache result for further use in current execution
		$this->cached_trial_available = $result;

		return $result;
	}

	/**
	 * Get plan for logged in user.
	 * @return integer
	 */
	public function getPlan() {
		$manager = SapphireWavesManager::getInstance();
		$result = 0;

		if ($_SESSION['logged']) {
			$user = $manager->getSingleItem(
								$manager->getFieldNames(),
								array('user' => $_SESSION['uid'])
							);

			if (is_object($user))
				$result = $user->type;
		}

		return $result;
	}

	/**
	 * Handle drawing Sapphire Waves user data.
	 *
	 * @param array $tag_params
	 * @param array $children
	 * @return void
	 */
	public function tag_User($tag_params, $children) {
		$manager = SapphireWavesManager::getInstance();
		$conditions = array();

		if (array_key_exists('user', $tag_params)) {
			// assign specified user
			$conditions['user'] = fix_id($tag_params['user']);

		} elseif (isset($_SESSION['logged']) && $_SESSION['logged']) {
			// if no user is specified, load data for currently logged
			$conditions['user'] = $_SESSION['uid'];

		} else {
			// default to no user
			$conditions['user'] = -1;
		}

		// load template
		$template = $this->loadTemplate($tag_params, 'user.xml');

		// get user data from database
		$item = $manager->getSingleItem($manager->getFieldNames(), $conditions);

		if (is_object($item)) {
			$params = array(
					'id'  				=> $item->id,
					'type'				=> $item->type,
					'user'				=> $item->user,
					'referral'			=> $item->referral,
					'remaining_time'	=> $item->remaining_time,
					'total_time'		=> $item->total_time,
					'timestamp'			=> $item->timestamp
				);

			$template->setLocalParams($params);
			$template->restoreXML();
			$template->parse();
		}
	}

	/**
	 * Handle drawing list of Sapphire Waves users.
	 *
	 * @param array $tag_params
	 * @param array $children
	 * @return void
	 */
	public function tag_UserList($tag_params, $children) {
		$manager = SapphireWavesManager::getInstance();
		$conditions = array();

		if (array_key_exists('referral', $tag_params))
			$conditions['referral'] = fix_id($tag_params['referral']);

		// load template
		$template = $this->loadTemplate($tag_params, 'user.xml');

		// get user data from the database
		$items = $manager->getItems($manager->getFieldNames(), $conditions);

		if (count($items) > 0) 
			foreach($items as $item) {
				$params = array(
						'id'  				=> $item->id,
						'type'				=> $item->type,
						'user'				=> $item->user,
						'referral'			=> $item->referral,
						'remaining_time'	=> $item->remaining_time,
						'total_time'		=> $item->total_time,
						'timestamp'			=> $item->timestamp
					);

				$template->setLocalParams($params);
				$template->restoreXML();
				$template->parse();
			}
	}
}
