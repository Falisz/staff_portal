import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Loading } from './Common';

const PostsShow = ({ postId, onClose }) => {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await axios.get(`/api/posts/${postId}`, { withCredentials: true });
                setPost(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching post:', err);
                setError('Post not found');
                setLoading(false);
            }
        };

        fetchPost();
    }, [postId]);

    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <Loading />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="post-modal-overlay">
                <div className="post-modal-content">
                    <h1>Post not found!</h1>
                    <button onClick={onClose} className="modal-close-button">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="post-modal-overlay" onClick={onClose}></div>
            <div className="post-modal-content">
                {post.title && <h1>{post.title}</h1>}
                <p>Posted by {post.User.first_name} {post.User.last_name}</p>
                <p>Channel: {post.Channel.name}</p>
                <p>
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
                <p>{post.content}</p>
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
                <button onClick={onClose} className="modal-close-button">
                    Close
                </button>
            </div>
        </>
    );
};

export default PostsShow;