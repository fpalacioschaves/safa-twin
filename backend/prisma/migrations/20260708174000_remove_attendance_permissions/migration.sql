DELETE rp
FROM `role_permissions` rp
INNER JOIN `permissions` p ON p.`id` = rp.`permission_id`
WHERE p.`slug` IN ('attendance.view', 'attendance.manage');

DELETE FROM `permissions`
WHERE `slug` IN ('attendance.view', 'attendance.manage');
