import { Controller } from 'egg'
const pump = require('mz-modules/pump');

const { Storage } = require('@google-cloud/storage');
const storage = new Storage({
  projectId: 'My First Project',
  keyFilename: 'config/My_First_Project-14b55a6edafc.json'
});
const format = require('util').format;


class TopicController extends Controller {
    public async addTopicImage(){
        const {ctx} = this;
        const parts = await ctx.multipart();
        const bucket = await storage.bucket('shopingram');
        let stream;

        if ((stream = await parts()) != null) {
          const filename = await stream.filename.toLowerCase();
        
          ctx.returnBody(200, "파일저장 성공")
          const blob = await bucket.file(filename);
          const blobStream = await blob.createWriteStream();
          await pump(stream, blobStream);
          const imgUrl = format(`https://storage.googleapis.com/shopingram/${blob.name}`);
          ctx.returnBody(200, "파일저장 성공", {
            'imgUrl': imgUrl
          });
        }
    }

    public async addTopic () {
        const {ctx} = this;
        const {topicImg, topicTitle} = ctx.request.body

        let userId = ctx.user.userId

        let newTopic = {
            topicImg: JSON.stringify(topicImg),
            topicTitle: topicTitle,
            userId,
        }

        await ctx.service.topic.insertTopic(newTopic)
        
        ctx.returnBody(200, "게시글 등록 성공")
    }


    public async addDiscuss () {
        const {ctx} = this;
        const {topicId, replyContent} = ctx.request.body

        let userId = ctx.user.userId
        let user = await this.service.user.getUserByUserId(userId)

        let newDiscuss = {
            topicId: topicId,
            replyContent: replyContent,
            replyName: user.username,
            userId,
        }

        let discuss: any =  await ctx.service.topic.insertDiscuss(newDiscuss)
        
        discuss && ctx.returnBody(200, "댓글등록 성공")
        !discuss && ctx.returnBody(400, "네트워크 오류. 다시 시도하세요.")
    }


    public async topicDetail () {
        const {ctx} = this;
        const {topicId} = ctx.request.query

        let topicDetail = await ctx.service.topic.topicDetailHanderl(topicId)
        
        ctx.returnBody(200, "성공", topicDetail)
    }

    public async friendsTopicList () {
        const {ctx} = this;

        let userId = ctx.user.userId

        let follower =  await ctx.service.follow.findFollow({
            followedId: userId,
            status: 1
        })
        
        let followList = follower.map((item) => {
            return item.userId
        })
        followList.push(userId)


        const Op = this.app.Sequelize.Op
        let topics = await ctx.service.topic.queryTopicList({
            userId: {
                [Op.in]: followList
            }
        })
        let topicList: any = [];

        for (let topic of topics) {
            let item = await ctx.service.topic.topicDetailHanderl(topic.topicId)
            topicList.push(item)
        }

        topicList && ctx.returnBody(200, "성공", topicList)
    }

    public async putLikeTopic () {
        const {ctx} = this;
        const {topicId, status} = ctx.request.body

        let userId = ctx.user.userId

        let topicStatus = {
            topicId: topicId,
            userId,
            status
        }

        let query = {
            topicId: topicId,
            userId,
        }

        await ctx.service.topic.putTopicLike(query, topicStatus)
        
        ctx.returnBody(200, "업데이트 완료", {
            status: +status
        })
    }

    public async searchTopic () {
        const {search} = this.ctx.request.query

        const Op = this.app.Sequelize.Op
        let topics = await this.ctx.service.topic.queryTopicList({
            topicTitle: {
                [Op.regexp]: search
            }
        })
        let topicList: any = [];

        for (let topic of topics) {
            let item = await this.ctx.service.topic.topicDetailHanderl(topic.topicId)
            topicList.push(item)
        }

        this.ctx.returnBody(200, "성공", topicList)
    }


    public async queryTopic () {
        let {ctx} = this
        let topicCounts = await ctx.service.topic.queryTopicCounts({
            userId: ctx.user.userId
        })

        return topicCounts
    }
}

module.exports = TopicController
