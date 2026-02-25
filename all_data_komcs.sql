-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               11.4.10-MariaDB - MariaDB Server
-- Server OS:                    Win64
-- HeidiSQL Version:             12.14.0.7165
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for cs_commission
CREATE DATABASE IF NOT EXISTS `cs_commission` /*!40100 DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci */;
USE `cs_commission`;

-- Dumping structure for table cs_commission.attendance_data
CREATE TABLE IF NOT EXISTS `attendance_data` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `branch_id` char(36) NOT NULL,
  `tanggal` date NOT NULL,
  `kehadiran` decimal(3,1) DEFAULT 1.0,
  `status_kehadiran` enum('hadir','setengah','izin','alpha') DEFAULT 'hadir',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_tanggal` (`user_id`,`tanggal`),
  UNIQUE KEY `uk_attendance_user_branch_date` (`user_id`,`branch_id`,`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` char(36) NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `entity` varchar(100) NOT NULL,
  `entity_id` char(36) DEFAULT NULL,
  `timestamp` datetime DEFAULT current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  PRIMARY KEY (`id`),
  KEY `fk_audit_user_log` (`user_id`),
  CONSTRAINT `fk_audit_user_log` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.branches
CREATE TABLE IF NOT EXISTS `branches` (
  `id` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `city` varchar(255) DEFAULT NULL,
  `target_min` decimal(15,2) DEFAULT 5000000.00,
  `target_max` decimal(15,2) DEFAULT 10000000.00,
  `n8n_endpoint` varchar(500) DEFAULT NULL,
  `last_sync_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `comm_perc_min` decimal(5,2) DEFAULT 0.20,
  `comm_perc_max` decimal(5,2) DEFAULT 0.40,
  `n8n_secret` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.commission_mutations
CREATE TABLE IF NOT EXISTS `commission_mutations` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `branch_id` varchar(10) DEFAULT NULL,
  `tanggal` date NOT NULL,
  `tipe` enum('masuk','keluar') NOT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `metode` varchar(50) DEFAULT NULL,
  `saldo_setelah` decimal(15,2) DEFAULT 0.00,
  `keterangan` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_mut_user` (`user_id`),
  KEY `fk_mut_branch` (`branch_id`),
  CONSTRAINT `fk_mut_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mut_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.commissions
CREATE TABLE IF NOT EXISTS `commissions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `branch_id` varchar(10) DEFAULT NULL,
  `omzet_total` decimal(15,2) NOT NULL,
  `commission_amount` decimal(15,2) NOT NULL,
  `commission_percentage` decimal(5,2) NOT NULL,
  `porsi_percent` decimal(5,2) DEFAULT NULL,
  `kehadiran` decimal(3,1) DEFAULT 1.0,
  `snapshot_meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`snapshot_meta`)),
  `status` enum('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
  `paid_date` date DEFAULT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`period_start`),
  UNIQUE KEY `uk_commissions_user_branch_date` (`user_id`,`branch_id`,`period_start`),
  KEY `idx_commissions_status` (`status`),
  KEY `fk_comm_branch` (`branch_id`),
  CONSTRAINT `fk_comm_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.cs_penugasan
CREATE TABLE IF NOT EXISTS `cs_penugasan` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `cabang_id` varchar(10) NOT NULL,
  `tanggal_mulai` date NOT NULL,
  `tanggal_selesai` date DEFAULT NULL,
  `faktor_komisi` decimal(5,2) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_penugasan_user_cabang_date` (`user_id`,`cabang_id`,`tanggal_mulai`),
  KEY `idx_penugasan_user` (`user_id`,`tanggal_mulai`),
  KEY `idx_penugasan_cabang` (`cabang_id`,`tanggal_mulai`),
  KEY `idx_penugasan_selesai` (`tanggal_selesai`),
  CONSTRAINT `fk_penugasan_cabang` FOREIGN KEY (`cabang_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_penugasan_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_faktor_komisi` CHECK (`faktor_komisi` > 0 and `faktor_komisi` <= 1.00)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.n8n_live_cache
CREATE TABLE IF NOT EXISTS `n8n_live_cache` (
  `branch_id` varchar(10) NOT NULL,
  `tanggal` date NOT NULL,
  `cash` decimal(15,2) DEFAULT 0.00,
  `piutang` decimal(15,2) DEFAULT 0.00,
  `total` decimal(15,2) DEFAULT 0.00,
  `last_fetched_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`branch_id`,`tanggal`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.omzet_stats_monthly
CREATE TABLE `omzet_stats_monthly` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `branch_id` varchar(10) NOT NULL,
  `year` int(11) NOT NULL,
  `month` int(11) NOT NULL,
  `total_omzet` decimal(15,2) DEFAULT NULL,
  `avg_daily` decimal(15,2) DEFAULT NULL,
  `median_daily` decimal(15,2) DEFAULT NULL,
  `min_daily` decimal(15,2) DEFAULT NULL,
  `max_daily` decimal(15,2) DEFAULT NULL,
  `win_rate_max` decimal(5,2) DEFAULT NULL,
  `win_rate_min` decimal(5,2) DEFAULT NULL,
  `days_count` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_branch_year_month` (`branch_id`,`year`,`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.omzet
CREATE TABLE IF NOT EXISTS `omzet` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `branch_id` varchar(10) DEFAULT NULL,
  `date` date NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_final` tinyint(1) DEFAULT 0,
  `source` enum('AUTO','MANUAL_UPDATE','IMPORT') DEFAULT 'IMPORT',
  `last_synced_at` datetime DEFAULT NULL,
  `cash` decimal(15,2) DEFAULT 0.00,
  `bayar_piutang` decimal(15,2) DEFAULT 0.00,
  `total` decimal(15,2) DEFAULT 0.00,
  `min_omzet` decimal(15,2) DEFAULT 0.00,
  `max_omzet` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_branch_date` (`branch_id`,`date`),
  KEY `idx_omzet_date` (`date`),
  KEY `idx_omzet_branch_date` (`branch_id`,`date`),
  KEY `idx_omzet_user_date` (`user_id`,`date`),
  CONSTRAINT `fk_omzet_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_omzet_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.omzetbulanan
CREATE TABLE IF NOT EXISTS `omzetbulanan` (
  `id` char(36) NOT NULL,
  `branch_id` char(36) NOT NULL,
  `month` tinyint(4) NOT NULL,
  `year` smallint(6) NOT NULL,
  `min_omzet` decimal(15,2) NOT NULL,
  `max_omzet` decimal(15,2) NOT NULL,
  `updated_by` char(36) DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `comm_perc_min` decimal(5,2) DEFAULT NULL,
  `comm_perc_max` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_branch_month_year` (`branch_id`,`month`,`year`),
  KEY `fk_ob_user` (`updated_by`),
  CONSTRAINT `fk_ob_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ob_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.system_settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` char(36) NOT NULL,
  `setting_key` varchar(255) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` char(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `nama` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('super_admin','admin','hrd','cs','owner') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `resign_date` date DEFAULT NULL,
  `branch_id` varchar(10) DEFAULT NULL,
  `faktor_pengali` decimal(5,2) DEFAULT 1.00,
  `saldo_awal` decimal(15,2) DEFAULT 0.00,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_email` (`email`),
  KEY `fk_user_branch` (`branch_id`),
  CONSTRAINT `fk_user_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.withdrawal_requests
CREATE TABLE IF NOT EXISTS `withdrawal_requests` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `branch_id` varchar(10) DEFAULT NULL,
  `nominal` decimal(15,2) NOT NULL,
  `metode` varchar(50) DEFAULT 'transfer',
  `keterangan` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `tanggal` date NOT NULL,
  `catatan` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_wd_user` (`user_id`),
  KEY `fk_wd_branch` (`branch_id`),
  CONSTRAINT `fk_wd_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE SET NULL,
  CONSTRAINT \`fk_wd_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Data exporting was unselected.

-- Dumping structure for table cs_commission.n8n_live_cache
CREATE TABLE IF NOT EXISTS \`n8n_live_cache\` (
  \`branch_id\` varchar(10) NOT NULL,
  \`tanggal\` date NOT NULL,
  \`cash\` decimal(15,2) DEFAULT 0.00,
  \`piutang\` decimal(15,2) DEFAULT 0.00,
  \`total\` decimal(15,2) DEFAULT 0.00,
  \`last_fetched_at\` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (\`branch_id\`,\`tanggal\`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
