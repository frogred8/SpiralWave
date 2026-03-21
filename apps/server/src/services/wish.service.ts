import { WishModel, Wish } from '../models/wish.model';

export const WishService = {
  async addWish(wishData: Wish) {
    if (!wishData.email || !wishData.msg) {
      throw new Error('Email and message are required');
    }
    return await WishModel.create(wishData);
  }
};
