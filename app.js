import request from 'superagent';
import fs from 'fs/promises';
const COURSES = {
    '09af6ece-5d7d-433c-a787-5ab24408949f': 'CST-221',
    '4d076846-b225-417c-bda7-9a3ac4a012c9': 'CST-345',
    '6d8029e3-2926-4112-85c9-fb146dfcd9f8': 'CST-201',
    'd7d3ee5f-157e-4306-a3c0-bf0c56c2eb25': 'CST-339',
};

//fetch and store token at an interval
const token = JSON.parse(await fs.readFile('./cache/auth-token.json', 'utf-8'));

const getNewAnnouncements = async function (class_id) {
    const res = await request.post('https://gateway.halo.gcu.edu')
        .set({
            accept: '*/*',
            'content-type': 'application/json',
            authorization: `Bearer ${token.token}`,
            contexttoken: `Bearer ${token.contexttoken}`,
        })
        .send({
            operationName: 'GetAnnouncementsStudent',
            variables: {
                courseClassId: class_id,
            },
            query: 'query GetAnnouncementsStudent($courseClassId: String!) {\n  announcements(courseClassId: $courseClassId) {\n    contextId\n    countUnreadPosts\n    courseClassId\n    dueDate\n    forumId\n    forumType\n    lastPost {\n      isReplied\n      __typename\n    }\n    startDate\n    endDate\n    title\n    posts {\n      content\n      expiryDate\n      forumId\n      forumTitle\n      id\n      isRead\n      modifiedDate\n      originalPostId\n      parentPostId\n      postStatus\n      publishDate\n      startDate\n      tenantId\n      title\n      postReadReceipts {\n        readTime\n        __typename\n      }\n      postTags {\n        tag\n        __typename\n      }\n      createdBy {\n        id\n        user {\n          firstName\n          lastName\n          __typename\n        }\n        __typename\n      }\n      resources {\n        kind\n        name\n        id\n        description\n        type\n        active\n        context\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
        })
        .catch(console.error);
    return res.body.data.announcements.posts
        .filter(post => new Date(post.publishDate).getTime() > new Date().getTime() - 10000)
        .map(post => ({...post, courseClassId: class_id}));    
};

const parseAnnouncementData = function (announcements) {
    return announcements.map(obj => ({
        content: `New Announcement posted for **${COURSES[obj.courseClassId]}**`,
        embeds: [{
            color: 0x26b3ff,
            title: obj.title,
            description: `by ${obj.createdBy.user.firstName} ${obj.createdBy.user.lastName}`,
            fields:[
                {
                    name: 'Message',
                    value: obj.content.replaceAll('<br>', '\n').replace(/<\/?[^>]+(>|$)/g, ""),
                },
                ...(!!obj.resources.length ? [{
                    name: `Attachments (${obj.resources.length})`,
                    value: obj.resources
                        .map(rs => `[\`${rs.name}\`](https://halo.gcu.edu/resource/${rs.id})`)
                        .join(', '),
                }] : []),
            ],
            timestamp: obj.publishDate,
        }],
    }));
}

const sendWebhook = function (data) {
    request
        .post('https://discord.com/api/webhooks/885222143607050271/Dj4QvZpAsjTMWueGZcInW3LiFL7-TZKcEJFJf1MaEIgZbWwiRwCa9Ve-PO1jRWMd3QkF')
        .send(data)
        .catch(console.error);
}

const main = async function () {
    for(const id in COURSES) {
        console.log(`Getting data for ${COURSES[id]}...`);
        for(const data of parseAnnouncementData(await getNewAnnouncements(id)))
            sendWebhook(data);
    }
}

setInterval(main, 10000);
