// FRONTEND/PostsIndex.js
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Loading } from './Common';
import PostsShow from './PostsShow';
import '../PostsIndex.css';

const PostsIndex = ({ user }) => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [channels, setChannels] = useState([]);
    const [selectedChannelId, setSelectedChannelId] = useState(user?.selected_channel || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPostId, setSelectedPostId] = useState(null);


    useEffect(() => {
        const fetchCurrentChannel = async () => {
            try {
                const res = await axios.get('/api/access', { withCredentials: true });
                setSelectedChannelId(res.data.user.selected_channel || false);
            } catch (error) {
                console.error('Error fetching nav_collapsed:', error);
                setSelectedChannelId(null);
            }
        };
        fetchCurrentChannel().then();
    }, []);


    useEffect(() => {
        const fetchData = async () => {
            try {
                const channelsResponse = await axios.get('/api/channels', { withCredentials: true });
                setChannels(channelsResponse.data);

                const postsResponse = await axios.get('/api/posts', { withCredentials: true });
                setPosts(postsResponse.data);

                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again later.');
                setLoading(false);
            }
        };

        fetchData().then();
    }, []);

    useEffect(() => {
        if (postId) {
            setSelectedPostId(parseInt(postId));
        } else {
            setSelectedPostId(null);
        }
    }, [postId]);

    const handleChannelSelect = async (channelId) => {
        try {
            const response = await axios.post(
                '/api/select-channel',
                { user, channelId: channelId || null },
                { withCredentials: true }
            );
            if (response.data.success) {
                setSelectedChannelId(channelId || null);

                const postsResponse = await axios.get('/api/posts', { withCredentials: true });
                setPosts(postsResponse.data);
            }
        } catch (err) {
            console.error('Error selecting channel:', err);
            setError('Failed to select channel. Please try again.');
        }
    };

    const closePostModal = () => {
        setSelectedPostId(null);
        navigate('/posts');
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="posts-container">
            <div className="channels-sidebar">
                <ul className="channel-list">
                    <li
                        className={`channel-item ${selectedChannelId === null ? 'selected' : ''}`}
                        onClick={() => handleChannelSelect(null)}
                    >
                        All Channels
                    </li>
                    {channels.map((channel) => (
                        <li
                            key={channel.ID}
                            className={`channel-item ${selectedChannelId === channel.ID ? 'selected' : ''}`}
                            onClick={() => handleChannelSelect(channel.ID)}
                        >
                            {channel.name}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="posts-index">
                {posts.length === 0 || error ? (
                    <p>No posts available.</p>
                ) : (
                    <ul className="post-list">
                        {posts.map((post) => (
                            <li key={post.ID} className="post-item">
                                <h2>
                                    <Link
                                        to={`/posts/${post.ID}`}
                                        className="post-title-button"
                                    >
                                        {post.title || 'Post'}
                                    </Link>
                                </h2>
                                <p>
                                    Posted by {post.User.first_name} {post.User.last_name} on{' '}
                                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                                <p>Channel: {post.Channel.name}</p>
                                <p>
                                    {post.content.length > 200
                                        ? `${post.content.substring(0, 200)}...`
                                        : post.content}
                                </p>
                                {post.isEdited && (
                                    <p>
                                        Last edited:{' '}
                                        {new Date(post.updatedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {selectedPostId && (
                <PostsShow postId={selectedPostId} onClose={closePostModal} />
            )}
        </div>
    );
};

export default PostsIndex;