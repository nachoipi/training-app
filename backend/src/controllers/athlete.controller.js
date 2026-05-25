import { UserModel } from '../models/user.model.js';

export const getAthletes = async (req, res, next) => {
    try {
        const data = await UserModel.findAthletes();
        res.json({ data, total: data.length });
    } catch (err) { next(err); }
};
