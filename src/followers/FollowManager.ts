import { Reileta } from "../Reileta";
// import { ErrorCodes, getMyAdress } from "../utils/Constants";
import { FollowInfo, UserInfo } from "../utils/Interfaces";
import { ErrorMessage } from "../utils/Security";
// import { FollowAPIWeb } from "./FollowAPIWeb";

export class FollowManager {

    // api_web: FollowAPIWeb;

    constructor(private readonly app: Reileta) {
        // this.api_web = new FollowAPIWeb(this.app, this);
    }

    // async createFollowing(from?: string, to?: string, who?: UserInfo): Promise<FollowInfo | ErrorMessage> {
    //     try {
    //         if (!who)
    //             return new ErrorMessage(ErrorCodes.UserNotLogged);
    //         let t_up = this.app.users.strToObject(to);
    //         let f_up = this.app.users.strToObject(from);
    //         if (!t_up || !f_up)
    //             return new ErrorMessage(ErrorCodes.UserNotFound);
    //         let from_user = await this.app.users.getInternalUser(f_up.id);
    //         if (from_user instanceof ErrorMessage)
    //             return from_user;
    //         let to_user: UserInfo | ErrorMessage;
    //         if (t_up.server && t_up.server !== getMyAdress())
    //             to_user = await this.app.users.getExternalUser(t_up.id, t_up.server, who);
    //         else to_user = await this.app.users.getInternalUser(t_up.id);
    //         if (to_user instanceof ErrorMessage)
    //             return to_user;
    //         var to_id = this.app.users.objectToStrId(to_user);
    //         if (!to_id)
    //             return new ErrorMessage(ErrorCodes.UserNotFound);
    //         let follow = await this.app.prisma.follow.findFirst({
    //             where: { from_id: from_user.id, to_id: to_id }
    //         });
    //         if (follow)
    //             return new ErrorMessage(ErrorCodes.AlreadyFollowing);
    //         follow = await this.app.prisma.follow.create({
    //             data: {
    //                 from_id: from_user.id,
    //                 to_id: to_id,
    //                 is_out: true
    //             }
    //         });
    //         if (!follow)
    //             return new ErrorMessage(ErrorCodes.InternalError);
    //         return {
    //             id: follow.id,
    //             from: from_user,
    //             to: to_user
    //         }
    //     } catch (err) {
    //         console.warn(err);
    //         return new ErrorMessage(ErrorCodes.InternalError);
    //     }
    // }

    // async getFollowers(user_id?: string, who?: UserInfo): Promise<FollowInfo[] | ErrorMessage> {
    //     try {
    //         if (!who)
    //             return new ErrorMessage(ErrorCodes.UserNotLogged);
    //         let user = await this.app.users.getInternalUser(user_id);
    //         if (user instanceof ErrorMessage)
    //             return user;
    //         let followers = await this.app.prisma.follow.findMany({
    //             where: { to_id: user.id, is_out: false }
    //         });
    //         let result: FollowInfo[] = (await Promise.all(followers.map(async (follow) => {
    //             let from_user: UserInfo | ErrorMessage;
    //             let f_up = this.app.users.strToObject(follow.from_id);
    //             if (f_up?.server && f_up.server !== getMyAdress())
    //                 from_user = await this.app.users.getExternalUser(f_up.id, f_up.server, who);
    //             else from_user = await this.app.users.getInternalUser(f_up?.id);
    //             if (from_user instanceof ErrorMessage)
    //                 return from_user;
    //             return {
    //                 id: follow.id,
    //                 from: from_user,
    //                 to: user
    //             }
    //         }))).filter(e => !(e instanceof ErrorMessage)) as FollowInfo[];
    //         return result;
    //     } catch (err) {
    //         console.warn(err);
    //         return new ErrorMessage(ErrorCodes.InternalError);
    //     }
    // }

    // async getFollowings(user_id?: string, who?: UserInfo): Promise<FollowInfo[] | ErrorMessage> {
    //     try {
    //         if (!who)
    //             return new ErrorMessage(ErrorCodes.UserNotLogged);
    //         let user = await this.app.users.getInternalUser(user_id);
    //         if (user instanceof ErrorMessage)
    //             return user;
    //         let followings = await this.app.prisma.follow.findMany({
    //             where: { from_id: user.id, is_out: true }
    //         });
    //         let result: FollowInfo[] = (await Promise.all(followings.map(async (follow) => {
    //             try {
    //                 let to_user: UserInfo | ErrorMessage;
    //                 let t_up = this.app.users.strToObject(follow.to_id);
    //                 if (t_up?.server && t_up.server !== getMyAdress())
    //                     to_user = await this.app.users.getExternalUser(t_up.id, t_up.server, who);
    //                 else to_user = await this.app.users.getInternalUser(t_up?.id);
    //                 if (to_user instanceof ErrorMessage)
    //                     throw to_user;
    //                 return {
    //                     id: follow.id,
    //                     from: user,
    //                     to: to_user
    //                 }
    //             } catch (err) {
    //                 console.warn(err);
    //                 return null;
    //             }
    //         }))).filter(e => e instanceof Object) as FollowInfo[];
    //         return result;
    //     } catch (err) {
    //         console.warn(err);
    //         return new ErrorMessage(ErrorCodes.InternalError);
    //     }
    // }
}