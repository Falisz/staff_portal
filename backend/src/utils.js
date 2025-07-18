//BACKEND/utils.js
const { sequelize, AppPage, User, UserDetails, UserConfigs, Channel, Post} = require('./db')

const bcrypt = require('bcrypt');

async function authUser(login, password) {
    try {
        const isInteger = Number.isInteger(Number(login));
        const isEmailFormat = typeof login === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login);

        const user = await User.findOne({
            where: isInteger ? { ID: login } : (isEmailFormat ? { email: login } : { login: login }),
            include: [
                { model: UserDetails, as: 'UserDetails' },
                { model: UserConfigs, as: 'UserConfigs' }
            ]
        });

        if (!user) {
            return { valid: false, status: 401, message: 'Invalid credentials!' };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return { valid: false, status: 401, message: 'Invalid credentials, wrong password!' };
        }

        if (!user.active || user.removed) {
            return { valid: false, status: 403, message: 'User inactive.' };
        }

        return { valid: true, user: user };
    } catch (err) {
        console.error('Error authenticating user:', err);
        return { valid: false, status: 500, message: 'Server error' };
    }
}

function serializeUser(user) {
    return {
        ID: user.ID,
        first_name: user.UserDetails.first_name || '',
        last_name: user.UserDetails.last_name || '',
        active: user.active,
        role: user.role,
        manager_nav_collapsed: user.UserConfigs.manager_nav_collapsed || false,
        manager_view: user.UserConfigs.manager_view_enabled || false,
    };
}

async function refreshUser(user) {
    try {
        if (!user?.ID) return null;

        const refreshedUser = await User.findOne({
            where: { ID: user.ID },
            include: [
                { model: UserDetails, as: 'UserDetails' },
                { model: UserConfigs, as: 'UserConfigs' }
            ]
        });

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
        const result = await UserConfigs.findOne({
            where: { user: user.ID }
        });

        return result ? result.manager_view_access : false;
    } catch (err) {
        console.error(`Error checking Manager Access for user: ${user.ID}`, err);
        return false;
    }
}

async function setManagerView(user, value) {
    try {
        const [updated] = await UserConfigs.update(
            { manager_view_enabled: value },
            { where: { user: user.ID } }
        );

        return updated === 1;
    } catch (err) {
        console.error(`Error updating manager view for user: ${user.ID}`, err);
        return false;
    }
}

async function setNavCollapsed(user, value) {
    try {
        const [updated] = await UserConfigs.update(
            { manager_nav_collapsed: value },
            { where: { user: user.ID } }
        );

        return updated === 1;
    } catch (err) {
        console.error(`Error updating nav collapsed for user: ${user.ID}`, err);
        return false;
    }
}

async function getPages(user) {
    try {
        const userConfigs = await UserConfigs.findOne({ where: { user: user.ID } });

        const view = (userConfigs?.manager_view_enabled || false) ? 1 : 0;

        const pages = [];
        const pageMap = new Map();

        const rows = await AppPage.findAll({
            where: { view: view },
            order: [
                sequelize.literal('CASE WHEN "parent" IS NULL THEN 0 ELSE 1 END'),
                ['parent', 'ASC'],
                ['ID', 'ASC']
            ]
        });

        for (const row of rows) {
            const page = {
                path: row?.path,
                title: row?.title,
                icon: row?.icon,
                hidden: row?.hidden,
                ...(row?.component ? { component: row.component } : {}),
                ...(row?.parent ? {} : { subpages: [] })
            };

            if (!row?.parent) {
                pageMap.set(row?.ID, page);
                pages.push(page);
            } else {
                const parent = pageMap.get(row.parent);
                if (parent) {
                    parent.subpages.push({
                        path: row.path,
                        title: row.title,
                        component: row.component,
                        hidden: row?.hidden,
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

async function getAllUsers() {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password', 'deleted'] },
            where: {removed: false },
            include: [
                { model: UserDetails,  as: 'UserDetails' }
            ],
            order: [['ID', 'ASC']]
        });
        return users.map(user => {
            const userData = {
                ...user.toJSON(),
                ...user.UserDetails.toJSON()
            };
            delete userData.UserDetails;
            return userData;
        });
    } catch (err) {
        console.error('Error fetching all users:', err);
        return null;
    }
}

async function getUserById(userId) {
    try {
        const user = await User.findOne({
            where: { ID: userId },
            attributes: { exclude: ['password', 'deleted'] },
            include: [
                { model: UserDetails,  as: 'UserDetails' }
            ],
            order: [['ID', 'ASC']]
        });

        if (user) {
            const userData = {
                ...user.toJSON(),
                ...user.UserDetails.toJSON()
            };

            delete userData.UserDetails;

            return userData;
        } else {
            return null;
        }
    } catch (err) {
        console.error(`Error fetching post with ID ${userId}:`, err);
        return null;
    }
}

async function createUser(data) {
    try {
        if (!data.email || !data.password || !data.first_name || !data.last_name) {
            return { success: false, status: 400, message: 'Email, password, first_name, and last_name are required.' };
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = await User.create({
            login: data.login || null,
            email: data.email,
            password: hashedPassword,
            active: true,
            removed: false,
        });

        await UserDetails.create({
            user: user.ID,
            first_name: data.first_name,
            last_name: data.last_name,
        });

        await UserConfigs.create({
            user: user.ID,
            manager_view_access: data.manager_view_access || false,
            manager_view_enabled: false,
            manager_nav_collapsed: false
        });

        return { success: true, user: user.ID};
    } catch (err) {
        console.error('Error creating post:', err);
        return { success: false, status: 500, message: 'Server error.' };
    }
}

async function editUser(userId, data) {
    try {
        const user = await User.findOne({
            where: { ID: userId, removed: false },
            include: [
                { model: UserDetails,  as: 'UserDetails' },
                { model: UserConfigs,  as: 'UserConfigs' },
            ],
        });

        if (!user) {
            return { success: false, status: 404, message: 'User not found.' };
        }

        const userUpdate = {};

        if (data.login !== undefined) userUpdate.login = data.login;
        if (data.email) userUpdate.email = data.email;
        if (data.password) userUpdate.password = await bcrypt.hash(data.password, 10);
        if (data.active !== undefined) userUpdate.active = data.active;

        await user.update(userUpdate);

        if (data.first_name || data.last_name) {
            await UserDetails.update(
                {
                    first_name: data.first_name || user.UserDetails?.first_name,
                    last_name: data.last_name || user.UserDetails?.last_name
                },
                { where: { user: userId } }
            );
        }

        if (data.manager_view_access) {
            await UserConfigs.update(
                {
                    manager_view_access: data.manager_view_access,
                },
                { where: { user: userId } }
            );
        }

        const updatedUser = await getUserById(userId);

        return { success: true, user: updatedUser };
    } catch (err) {
        console.error(`Error updating user with ID ${userId}:`, err);
        return { success: false, status: 500, message: 'Server error.' };
    }
}

async function removeUser(userId) {
    try {
        const user = await User.findOne({
            where: { ID: userId, removed: false }
        });

        if (!user) {
            return { success: false, status: 404, message: 'User not found.' };
        }

        await user.update({ removed: true, active: false });

        return { success: true, message: 'User removed successfully.' };
    } catch (err) {
        console.error(`Error removing user with ID ${userId}:`, err);
        return { success: false, status: 500, message: 'Server error.' };
    }
}


async function getAllPosts() {
    try {
        const posts = await Post.findAll({
            include: [
                { model: User, attributes: ['ID'], include: [
                    { model: UserDetails, as: 'UserDetails', attributes: ['first_name', 'last_name'] }
                    ] },
                { model: Channel, attributes: ['ID', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        return posts.map(post => ({
            ...post.toJSON(),
            User: post?.User ? post.User.toJSON() : null
        }));
    } catch (err) {
        console.error('Error fetching all posts:', err);
        return false;
    }
}

async function getPostById(postId) {
    try {
        const post = await Post.findOne({
            where: { ID: postId },
            include: [
                { model: User, attributes: ['ID'], include: [
                        { model: UserDetails, as: 'UserDetails', attributes: ['first_name', 'last_name'] }
                    ] },
                { model: Channel, attributes: ['ID', 'name'] }
            ]
        });
        return post ? { ...post.toJSON(), User: post.User ? post.User.toJSON() : null } : null;
    } catch (err) {
        console.error(`Error fetching post with ID ${postId}:`, err);
        return false;
    }
}
async function createPost(data) {
    try {
        const channel = await Channel.findOne({ where: { ID: data.channelID } });
        if (!channel) {
            return { valid: false, status: 400, message: 'Invalid channel ID.' };
        }

        const user = await User.findOne({ where: { ID: data.authorID } });
        if (!user) {
            return { valid: false, status: 400, message: 'Invalid author ID.' };
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
            return { valid: false, status: 404, message: 'Post not found.' };
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
            return { valid: false, status: 404, message: 'Post not found.' };
        }

        await post.destroy();
    } catch (err) {
        console.error(`Error deleting post with ID ${postId}:`, err);
        throw err;
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
    getAllUsers,
    getUserById,
    createUser,
    editUser,
    removeUser,
    getAllPosts,
    getPostById,
    createPost,
    updatePost,
    deletePost
};