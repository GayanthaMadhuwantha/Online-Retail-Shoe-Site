import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, Edit, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const BASE_URL = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : '';

const ProductReviews = ({ productId }) => {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const { user, token } = useAuth();

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: ''
  });

  useEffect(() => {
    fetchReviews();
    if (user) {
      fetchUserReview();
    }
  }, [productId, page, sortBy, user]);

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${BASE_URL}/api/reviews/product/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setReviews(response.data.reviews);
      setSummary(response.data.summary);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserReview = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/reviews/user/${user.id}/${productId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      const data = await response.json(); // ✅ Parse the body here
      console.log(data); // ✅ now you’ll see the actual review data
      setUserReview(data);
    } catch (error) {
      console.error('Error fetching user review:', error);
    }
  };
  

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login to submit a review');
      return;
    }

    try {
      if (editingReview) {
        await fetch(`${BASE_URL}/api/reviews/${editingReview.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
              ...reviewForm,
              productId: productId,
              userId: user.id
          })
          
        });
        
        alert('Review updated successfully!');
      } else {
        const response = await fetch(`${BASE_URL}/api/reviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...reviewForm,
            productId,
            userId: user.id
          })
        });
        if (response.ok) {
          alert('Review submitted successfully!');
        }
        else{
          const errorData = await response.json();
          alert(errorData.error);
        }
      }
      
      setReviewForm({ rating: 5, title: '', comment: '' });
      setShowReviewForm(false);
      setEditingReview(null);
      fetchReviews();
      fetchUserReview();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit review');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      await fetch(`${BASE_URL}/api/reviews/${user.id}/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      alert('Review deleted successfully!');
      fetchReviews();
      fetchUserReview();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete review');
    }
  };

  const handleVoteReview = async (reviewId, isHelpful) => {
    if (!user) {
      alert('Please login to vote on reviews');
      return;
    }

    try {
      await fetch(`${BASE_URL}/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            isHelpful
        })
      });

      fetchReviews();
    } catch (error) {
      console.error('Error voting on review:', error);
    }
  };

  const startEditReview = (review) => {
    setEditingReview(review);
    setReviewForm({
      rating: review.rating,
      title: review.title,
      comment: review.comment
    });
    setShowReviewForm(true);
  
    
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onRatingChange(star) : undefined}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating
                  ? 'text-amber-400 fill-current'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderRatingDistribution = () => {
    if (!summary || summary.total_reviews === 0) return null;

    const ratings = [
      { stars: 5, count: summary.five_star },
      { stars: 4, count: summary.four_star },
      { stars: 3, count: summary.three_star },
      { stars: 2, count: summary.two_star },
      { stars: 1, count: summary.one_star }
    ];

    return (
      <div className="space-y-2">
        {ratings.map(({ stars, count }) => (
          <div key={stars} className="flex items-center space-x-3">
            <span className="text-sm font-medium w-8">{stars}★</span>
            <div className="flex-1 bg-slate-200 rounded-full h-2">
              <div
                className="bg-amber-400 h-2 rounded-full"
                style={{
                  width: `${summary.total_reviews > 0 ? (count / summary.total_reviews) * 100 : 0}%`
                }}
              />
            </div>
            <span className="text-sm text-slate-600 w-8">{count}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="bg-slate-200 h-8 rounded w-1/3"></div>
        <div className="bg-slate-200 h-32 rounded"></div>
        <div className="bg-slate-200 h-24 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Reviews Summary */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Customer Reviews</h2>
        
        {summary && summary.total_reviews > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-800 mb-2">
                {summary.average_rating ? summary.average_rating : '0.0'}
              </div>
              {renderStars(Math.round(summary.average_rating || 0))}
              <p className="text-slate-600 mt-2">
                Based on {summary.total_reviews} review{summary.total_reviews !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Rating Distribution</h3>
              {renderRatingDistribution()}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-600 text-lg">No reviews yet</p>
            <p className="text-slate-500">Be the first to review this product!</p>
          </div>
        )}
      </div>

      {/* Write Review Section */}
      {user && !userReview && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-800">Write a Review</h3>
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors"
            >
              {showReviewForm ? 'Cancel' : 'Write Review'}
            </button>
          </div>

          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rating
                </label>
                {renderStars(reviewForm.rating, true, (rating) =>
                  setReviewForm(prev => ({ ...prev, rating }))
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Review Title
                </label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Summarize your experience"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Your Review
                </label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Share your thoughts about this product"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-amber-500 text-white px-6 py-2 rounded-lg hover:bg-amber-600 transition-colors"
              >
                {editingReview ? 'Update Review' : 'Submit Review'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* User's Existing Review */}
      {userReview && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Your Review</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => startEditReview(userReview)}
                className="text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Edit className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDeleteReview(userReview.id)}
                className="text-red-600 hover:text-red-700 transition-colors"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            {renderStars(userReview.rating)}
            <h4 className="font-semibold text-slate-800">{userReview.title}</h4>
            <p className="text-slate-700">{userReview.comment}</p>
            <p className="text-sm text-slate-500">
              Reviewed on {new Date(userReview.created_at).toLocaleDateString()}
              {userReview.verified_purchase && (
                <span className="ml-2 inline-flex items-center text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Verified Purchase
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-800">
            All Reviews ({summary?.total_reviews || 0})
          </h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="created_at">Newest First</option>
            <option value="rating">Highest Rated</option>
            <option value="helpful_count">Most Helpful</option>
          </select>
        </div>

        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="border-b border-slate-200 pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    {renderStars(review.rating)}
                    <span className="font-semibold text-slate-800">{review.title}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-slate-600">
                    <span>By {review.name}</span>
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    {review.verified_purchase && (
                      <span className="inline-flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <p className="text-slate-700 mb-4">{review.comment}</p>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-600">Was this helpful?</span>
                <button
                  onClick={() => handleVoteReview(review.id, true)}
                  className="flex items-center space-x-1 text-sm text-slate-600 hover:text-green-600 transition-colors"
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Yes ({review.helpful_count || 0})</span>
                </button>
                <button
                  onClick={() => handleVoteReview(review.id, false)}
                  className="flex items-center space-x-1 text-sm text-slate-600 hover:text-red-600 transition-colors"
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>No</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-4 py-2 border rounded-md ${
                    page === i + 1
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductReviews;