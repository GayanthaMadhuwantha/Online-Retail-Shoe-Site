import React, { useState } from 'react';
import { X, Star, Send } from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose, orderData }) => {
  const [feedback, setFeedback] = useState({
    rating: 0,
    comment: '',
    recommend: null,
    experience: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Simulate feedback submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    alert('Thank you for your feedback! Your review helps us improve our service.');
    setSubmitting(false);
    onClose();
  };

  const handleRatingClick = (rating) => {
    setFeedback({ ...feedback, rating });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Share Your Experience</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Order #{orderData?.orderId}</h3>
              <p className="text-sm text-gray-600">
                Total: ${orderData?.totalAmount?.toFixed(2)} | Items: {orderData?.itemCount}
              </p>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating *
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= feedback.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tell us about your experience
              </label>
              <textarea
                value={feedback.comment}
                onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What did you think about our products and service?"
              />
            </div>

            {/* Recommendation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Would you recommend us to others? *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="recommend"
                    value="yes"
                    checked={feedback.recommend === 'yes'}
                    onChange={(e) => setFeedback({ ...feedback, recommend: e.target.value })}
                    className="mr-2"
                    required
                  />
                  Yes
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="recommend"
                    value="no"
                    checked={feedback.recommend === 'no'}
                    onChange={(e) => setFeedback({ ...feedback, recommend: e.target.value })}
                    className="mr-2"
                    required
                  />
                  No
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="recommend"
                    value="maybe"
                    checked={feedback.recommend === 'maybe'}
                    onChange={(e) => setFeedback({ ...feedback, recommend: e.target.value })}
                    className="mr-2"
                    required
                  />
                  Maybe
                </label>
              </div>
            </div>

            {/* Experience Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How was your shopping experience?
              </label>
              <select
                value={feedback.experience}
                onChange={(e) => setFeedback({ ...feedback, experience: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select an option</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="average">Average</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || feedback.rating === 0}
              className="w-full bg-blue-900 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Send className="h-5 w-5" />
              <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;