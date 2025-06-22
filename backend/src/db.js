//BACKEND/db.js
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();

const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'staff_portal',
    logging: false
});

const User = sequelize.define('User', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        defaultValue: () => Math.floor(Math.random() * 900000) + 100000
    },
    first_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    role: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    manager_view_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    manager_nav_collapsed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    password: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    selected_channel: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'users',
    timestamps: false
});

const Project = sequelize.define('Project', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    project_head: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    tableName: 'projects',
    timestamps: false
});

const Team = sequelize.define('Team', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    project: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    team_leader: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    tableName: 'projects',
    timestamps: false
});

const PagesStaff = sequelize.define('PagesStaff', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    parentID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    path: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    min_role: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    component: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'pages_staff',
    timestamps: false
});

const PagesManager = sequelize.define('PagesManager', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    parentID: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    path: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    min_role: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    component: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    tableName: 'pages_manager',
    timestamps: false
});

const ManagerViewAccess = sequelize.define('ManagerViewAccess', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userID: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'manager_view_access',
    timestamps: false
});


const Channel = sequelize.define('Channel', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    tableName: 'channels',
    timestamps: false
});

const Post = sequelize.define('Post', {
    ID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },
    channelID: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    authorID: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    isEdited: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'posts',
    timestamps: false
});

User.hasMany(ManagerViewAccess, { foreignKey: 'userID', sourceKey: 'ID' });
ManagerViewAccess.belongsTo(User, { foreignKey: 'userID', targetKey: 'ID' });
PagesStaff.belongsTo(PagesStaff, { foreignKey: 'parentID', targetKey: 'ID' });
PagesManager.belongsTo(PagesManager, { foreignKey: 'parentID', targetKey: 'ID' });
Channel.hasMany(Post, { foreignKey: 'channelID', sourceKey: 'ID' });
Post.belongsTo(Channel, { foreignKey: 'channelID', targetKey: 'ID' });
User.hasMany(Post, { foreignKey: 'authorID', sourceKey: 'ID' });
Post.belongsTo(User, { foreignKey: 'authorID', targetKey: 'ID' });

async function seedData() {
    try {
        await User.sync();
        await PagesStaff.sync();
        await PagesManager.sync();
        await ManagerViewAccess.sync();


        const userCount = await User.count();
        if (userCount > 0) {
            console.log('Users table is not empty, skipping seeding.');
        } else {
            const csvFilePath = path.join(__dirname, '..', 'users.csv');
            const users = [];
            const userRows = await new Promise((resolve, reject) => {
                const results = [];
                require('fs').createReadStream(csvFilePath)
                    .pipe(csv({
                        headers: ['ID', 'first_name', 'last_name', 'email', 'role', 'active', 'manager_view_enabled', 'manager_nav_collapsed', 'password'],
                        skipLines: 0
                    }))
                    .on('data', (data) => results.push(data))
                    .on('end', () => resolve(results))
                    .on('error', (err) => reject(err));
            });

            for (const row of userRows) {
                if (!row.ID || !row.first_name || !row.last_name || !row.email || !row.role || !row.password) {
                    console.warn('Skipping invalid user row:', row);
                    continue;
                }
                const active = row.active ? (row.active === '1' || row.active.toLowerCase() === 'true') : false;
                const manager_view_enabled = row.manager_view_enabled ? (row.manager_view_enabled === '1' || row.manager_view_enabled.toLowerCase() === 'true') : false;
                const manager_nav_collapsed = row.manager_nav_collapsed ? (row.manager_nav_collapsed === '1' || row.manager_nav_collapsed.toLowerCase() === 'true') : false;

                users.push({
                    ID: parseInt(row.ID) || Math.floor(Math.random() * 900000) + 100000,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    email: row.email,
                    role: parseInt(row.role),
                    active,
                    manager_view_enabled,
                    manager_nav_collapsed,
                    password: row.password,
                    selected_channel: null
                });
            }

            if (users.length === 0) {
                console.warn('No valid users to seed from users.csv');
            } else {
                await User.bulkCreate(users);
                console.log(`Seeded ${users.length} users from users.csv`);
            }
        }


        const pagesStaffCount = await PagesStaff.count();
        if (pagesStaffCount > 0) {
            console.log('PagesStaff table is not empty, skipping seeding.');
        } else {
            const pagesStaffFilePath = path.join(__dirname, '..', 'pages_staff.csv');
            const pagesStaff = [];
            const pagesStaffRows = await new Promise((resolve, reject) => {
                const results = [];
                require('fs').createReadStream(pagesStaffFilePath)
                    .pipe(csv({
                        headers: ['ID', 'parentID', 'path', 'title', 'min_role', 'component', 'icon'],
                        skipLines: 0
                    }))
                    .on('data', (data) => results.push(data))
                    .on('end', () => resolve(results))
                    .on('error', (err) => reject(err));
            });

            for (const row of pagesStaffRows) {
                if (!row.ID || !row.title || !row.min_role) {
                    console.warn('Skipping invalid pages_staff row:', row);
                    continue;
                }
                pagesStaff.push({
                    ID: parseInt(row.ID),
                    parentID: row.parentID ? parseInt(row.parentID) : null,
                    path: row.path,
                    title: row.title,
                    min_role: parseInt(row.min_role),
                    component: row.component || null,
                    icon: row.icon || null
                });
            }

            if (pagesStaff.length === 0) {
                console.warn('No valid pages_staff to seed from pages_staff.csv');
            } else {
                await PagesStaff.bulkCreate(pagesStaff);
                console.log(`Seeded ${pagesStaff.length} pages_staff from pages_staff.csv`);
            }
        }

        // Seed pages_manager
        const pagesManagerCount = await PagesManager.count();
        if (pagesManagerCount > 0) {
            console.log('PagesManager table is not empty, skipping seeding.');
        } else {
            const pagesManagerFilePath = path.join(__dirname, '..', 'pages_manager.csv');
            const pagesManager = [];
            const pagesManagerRows = await new Promise((resolve, reject) => {
                const results = [];
                require('fs').createReadStream(pagesManagerFilePath)
                    .pipe(csv({
                        headers: ['ID', 'parentID', 'path', 'title', 'min_role', 'component', 'icon'],
                        skipLines: 0
                    }))
                    .on('data', (data) => results.push(data))
                    .on('end', () => resolve(results))
                    .on('error', (err) => reject(err));
            });

            for (const row of pagesManagerRows) {
                if (!row.ID || !row.title || !row.min_role) {
                    console.warn('Skipping invalid pages_manager row:', row);
                    continue;
                }
                pagesManager.push({
                    ID: parseInt(row.ID),
                    parentID: row.parentID ? parseInt(row.parentID) : null,
                    path: row.path,
                    title: row.title,
                    min_role: parseInt(row.min_role),
                    component: row.component || null,
                    icon: row.icon || null
                });
            }

            if (pagesManager.length === 0) {
                console.warn('No valid pages_manager to seed from pages_manager.csv');
            } else {
                await PagesManager.bulkCreate(pagesManager);
                console.log(`Seeded ${pagesManager.length} pages_manager from pages_manager.csv`);
            }
        }

        // Seed manager_view_access
        const managerAccessCount = await ManagerViewAccess.count();
        if (managerAccessCount > 0) {
            console.log('ManagerViewAccess table is not empty, skipping seeding.');
        } else {
            const managerUserIds = [353621, 398285]; // Manager and test1
            const managerAccess = [];
            for (const userId of managerUserIds) {
                const exists = await User.findOne({ where: { ID: userId } });
                if (exists) {
                    managerAccess.push({ userID: userId });
                } else {
                    console.warn(`User ID ${userId} not found, skipping manager_view_access entry.`);
                }
            }

            if (managerAccess.length === 0) {
                console.warn('No valid manager_view_access entries to seed.');
            } else {
                await ManagerViewAccess.bulkCreate(managerAccess);
                console.log(`Seeded ${managerAccess.length} manager_view_access entries.`);
            }
        }

        // Seed channels
        const channelCount = await Channel.count();
        if (channelCount > 0) {
            console.log('Channels table is not empty, skipping seeding.');
        } else {
            const channels = [
                { name: 'General Discussion' },
                { name: 'Announcements' },
                { name: 'Ideas and Suggestions' }
            ];
            await Channel.bulkCreate(channels);
            console.log(`Seeded ${channels.length} channels.`);
        }

        // Seed posts
        const postCount = await Post.count();
        if (postCount > 0) {
            console.log('Posts table is not empty, skipping seeding.');
        } else {
            const users = await User.findAll({ attributes: ['ID'] });
            const channels = await Channel.findAll({ attributes: ['ID'] });
            if (users.length === 0 || channels.length === 0) {
                console.warn('No users or channels found, skipping posts seeding.');
            } else {
                const posts = [
                    {
                        channelID: channels[0].ID,
                        authorID: users[0].ID,
                        title: 'Welcome to the Forum',
                        content: 'This is the first post in our new forum. Feel free to share your thoughts!',
                        createdAt: new Date(),
                        isEdited: false
                    },
                    {
                        channelID: channels[1].ID,
                        authorID: users[0].ID,
                        title: 'Company Update',
                        content: 'We have some exciting news to share about upcoming projects!',
                        createdAt: new Date(Date.now() - 86400000), // 1 day ago
                        isEdited: true,
                        updatedAt: new Date()
                    },
                    {
                        channelID: channels[2].ID,
                        authorID: users[1]?.ID || users[0].ID,
                        title: null,
                        content: 'I have an idea for improving our workflow. Let’s discuss!',
                        createdAt: new Date(Date.now() - 172800000), // 2 days ago
                        isEdited: false
                    }
                ];
                await Post.bulkCreate(posts);
                console.log(`Seeded ${posts.length} posts.`);
            }
        }
    } catch (err) {
        console.error('Error seeding data:', err.message, err.stack);
        throw err;
    }
}

module.exports = {
    sequelize,
    User,
    PagesStaff,
    PagesManager,
    ManagerViewAccess,
    Post,
    Channel,
    seedData
};