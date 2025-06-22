//BACKEND/utils.js
const { sequelize, User, PagesStaff, PagesManager, ManagerViewAccess, Post, Channel } = require('./db');
const bcrypt = require('bcrypt');

async function authUser(login, password) {
    try {
        const isInteger = Number.isInteger(Number(login));

        const user = await User.findOne({
            where: isInteger ? { ID: login } : { email: login }
        });

        if (!user) {
            return { valid: false, status: 401, message: 'Invalid credentials!' };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return { valid: false, status: 401, message: 'Invalid credentials, wrong password!' };
        }

        if (!user.active) {
            return { valid: false, status: 403, message: 'User inactive.' };
        }

        return { valid: true, user: user.toJSON() };
    } catch (err) {
        console.error('Error authenticating user:', err);
        return { valid: false, status: 500, message: 'Server error' };
    }
}

function serializeUser(user) {
    return {
        ID: user.ID,
        first_name: user.first_name,
        last_name: user.last_name,
        active: user.active,
        role: user.role,
        manager_nav_collapsed: user.manager_nav_collapsed,
        manager_view: user.manager_view_enabled,
        selected_channel: user.selected_channel
    };
}

async function refreshUser(user) {
    try {
        if (!user?.ID) return null;

        const refreshedUser = await User.findOne({ where: { ID: user.ID } });

        return refreshedUser ? serializeUser(refreshedUser.toJSON()) : null;
    } catch (err) {
        console.error('Error refreshing user:', err);
        return null;
    }
}

async function checkUserAccess(user) {
    try {
        const result = await User.findOne({
            attributes: ['active'],
            where: { ID: user.ID }
        });

        return result ? result.active : false;
    } catch (err) {
        console.error('Error checking user access:', err);
        return false;
    }
}

async function checkManagerAccess(user) {
    try {
        const result = await ManagerViewAccess.findOne({
            where: { userID: user.ID }
        });

        return !!result;
    } catch (err) {
        console.error(`Error checking Manager Access for userID: ${user.ID}`, err);
        return false;
    }
}

async function setManagerView(user, value) {
    try {
        const [updated] = await User.update(
            { manager_view_enabled: value },
            { where: { ID: user.ID } }
        );

        return updated === 1;
    } catch (err) {
        console.error(`Error updating manager view for userID: ${user.ID}`, err);
        return false;
    }
}

async function setNavCollapsed(user, value) {
    try {
        const [updated] = await User.update(
            { manager_nav_collapsed: value },
            { where: { ID: user.ID } }
        );

        return updated === 1;
    } catch (err) {
        console.error(`Error updating nav collapsed for userID: ${user.ID}`, err);
        return false;
    }
}

async function getPages(user) {
    try {
        const isManagerView = user?.manager_view || false;
        const Model = isManagerView ? PagesManager : PagesStaff;

        const rows = await Model.findAll({
            order: [
                sequelize.literal('CASE WHEN "parentID" IS NULL THEN 0 ELSE 1 END'),
                ['parentID', 'ASC'],
                ['ID', 'ASC']
            ]
        });

        const pages = [];
        const pageMap = new Map();

        for (const row of rows) {
            const page = {
                path: row.path,
                title: row.title,
                icon: row.icon,
                minRole: row.min_role,
                ...(row.component ? { component: row.component } : {}),
                ...(row.parentID ? {} : { subpages: [] })
            };

            if (!row.parentID) {
                pageMap.set(row.ID, page);
                pages.push(page);
            } else {
                const parent = pageMap.get(row.parentID);
                if (parent) {
                    parent.subpages.push({
                        path: row.path,
                        title: row.title,
                        minRole: row.min_role,
                        component: row.component
                    });
                }
            }
        }

        return pages;
    } catch (err) {
        console.error(`Error getting pages: ${err}`, err);
        return [];
    }
}

function logoutUser(req, res) {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }

        res.clearCookie('connect.sid', { path: '/', sameSite: 'lax', httpOnly: true });
        res.json({ message: 'Logged out' });
    });
}
async function getAllPosts(channelId = null) {
    try {
        const where = channelId ? { channelID: channelId } : {};
        const posts = await Post.findAll({
            where,
            include: [
                { model: User, attributes: ['ID', 'first_name', 'last_name'] },
                { model: Channel, attributes: ['ID', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        return posts.map(post => post.toJSON());
    } catch (err) {
        console.error('Error fetching all posts:', err);
        throw err;
    }
}

async function getPostById(postId) {
    try {
        const post = await Post.findOne({
            where: { ID: postId },
            include: [
                { model: User, attributes: ['ID', 'first_name', 'last_name'] },
                { model: Channel, attributes: ['ID', 'name'] }
            ]
        });
        return post ? post.toJSON() : null;
    } catch (err) {
        console.error(`Error fetching post with ID ${postId}:`, err);
        throw err;
    }
}
async function createPost(data) {
    try {
        const channel = await Channel.findOne({ where: { ID: data.channelID } });
        if (!channel) {
            throw new Error('Invalid channel ID.');
        }

        const user = await User.findOne({ where: { ID: data.authorID } });
        if (!user) {
            throw new Error('Invalid author ID.');
        }

        const post = await Post.create({
            channelID: data.channelID,
            authorID: data.authorID,
            title: data.title,
            content: data.content,
            createdAt: new Date(),
            isEdited: false,
            updatedAt: null
        });

        return await getPostById(post.ID);
    } catch (err) {
        console.error('Error creating post:', err);
        throw err;
    }
}
async function updatePost(postId, data) {
    try {
        const post = await Post.findOne({ where: { ID: postId } });
        if (!post) {
            throw new Error('Post not found.');
        }

        await post.update({
            title: data.title,
            content: data.content,
            isEdited: true,
            updatedAt: new Date()
        });

        return await getPostById(postId);
    } catch (err) {
        console.error(`Error updating post with ID ${postId}:`, err);
        throw err;
    }
}

async function deletePost(postId) {
    try {
        const post = await Post.findOne({ where: { ID: postId } });
        if (!post) {
            throw new Error('Post not found.');
        }

        await post.destroy();
    } catch (err) {
        console.error(`Error deleting post with ID ${postId}:`, err);
        throw err;
    }
}

async function setSelectedChannel(user, channelId) {
    try {
        const [updated] = await User.update(
            { selected_channel: channelId },
            { where: { ID: user.ID } }
        );
        return updated === 1;
    } catch (err) {
        console.error(`Error updating selected channel for userID: ${user.ID}`, err);
        return false;
    }
}

module.exports = {
    authUser,
    serializeUser,
    refreshUser,
    checkUserAccess,
    checkManagerAccess,
    setManagerView,
    setNavCollapsed,
    getPages,
    logoutUser,
    getAllPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost,
    setSelectedChannel
};