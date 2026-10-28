const express = require('express');
const prisma = require('../../lib/prisma');
const { verifyToken }  = require('../../middleware/auth');
const { requireRole }  = require('../../middleware/rbac');

const router = express.Router();
// FR-05.5: Only super_admin can manage roles
router.use(verifyToken, requireRole('super_admin'));

/** GET /api/admin/rbac/roles */
router.get('/roles', async (_req, res) => {
  try {
    let roles = await prisma.role.findMany({
      include: { permissions: true },
      orderBy: { name: 'asc' },
    });

    // Ensure core system roles exist
    const systemRoleNames = roles.map(r => r.name);
    if (!systemRoleNames.includes('regional_admin')) {
      try {
        const regionalPerms = [
          'view_dashboard', 'manage_vendors', 'view_vendors', 
          'manage_riders', 'view_riders', 'manage_orders', 
          'view_orders', 'manage_support', 'view_support', 'manage_cod', 'manage_payouts'
        ];
        const newRole = await prisma.role.create({
          data: {
            name: 'regional_admin',
            displayName: 'Regional Admin',
            isSystem: true,
            permissions: {
              create: regionalPerms.map(p => ({ permission: p })),
            },
          },
          include: { permissions: true },
        });
        roles.push(newRole);
      } catch (e) {
        console.warn('Could not auto-create regional_admin role:', e.message);
      }
    }

    const formatted = roles.map((r) => ({
      ...r,
      permissions: r.permissions.map((p) => p.permission),
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** POST /api/admin/rbac/roles */
router.post('/roles', async (req, res) => {
  try {
    const { name, displayName, permissions, isSystem } = req.body;
    const role = await prisma.role.create({
      data: {
        name,
        displayName,
        isSystem: isSystem || false,
        permissions: permissions && permissions.length
          ? { create: permissions.map((p) => ({ permission: p })) }
          : undefined,
      },
      include: { permissions: true },
    });
    res.status(201).json({ ...role, permissions: role.permissions.map((p) => p.permission) });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** PUT /api/admin/rbac/roles/:id */
router.put('/roles/:id', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    if (role.isSystem) return res.status(400).json({ error: 'System roles cannot be modified.' });

    const { displayName, permissions } = req.body;

    // Replace permissions if provided
    if (permissions) {
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: role.id, permission: p })),
      });
    }

    const updated = await prisma.role.update({
      where: { id: req.params.id },
      data: { displayName },
      include: { permissions: true },
    });
    res.json({ ...updated, permissions: updated.permissions.map((p) => p.permission) });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

/** DELETE /api/admin/rbac/roles/:id */
router.delete('/roles/:id', async (req, res) => {
  try {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    if (role.isSystem) return res.status(400).json({ error: 'System roles cannot be deleted.' });
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ message: 'Role deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

/** GET /api/admin/rbac/permissions — list all known permission strings */
router.get('/permissions', (_req, res) => {
  const PERMISSIONS = [
    'view_dashboard', 'manage_dashboard',
    'manage_finance', 'manage_payouts', 'manage_commissions', 'manage_cod',
    'view_vendors', 'manage_vendors',
    'view_riders', 'manage_riders',
    'manage_regional_admins',
    'view_products', 'manage_products', 'manage_services',
    'view_orders', 'manage_orders',
    'view_branches', 'manage_branches', 'manage_service_areas',
    'view_users', 'manage_users', 'manage_rbac',
    'view_support', 'manage_support',
    'manage_promotions', 'manage_offers', 'view_reports'
  ];
  res.json(PERMISSIONS);
});

/** PATCH /api/admin/rbac/users/:userId/role — assign role to a team member */
router.patch('/users/:userId/role', async (req, res) => {
  try {
    const { role, permissions } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { role, permissions: permissions || [] },
    });
    const { password, ...sanitized } = user;
    res.json(sanitized);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
