'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
    console.info('seeding blog post data');
    const seedData = [];

    for (let i=1; i<=10; i++) {
        seedData.push(generateBlogPostData());
    }
    return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
    return {
        author: {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName()
        },
        title: faker.name.title(),
        content: faker.lorem.paragraph(),
        created: faker.date.past()
    };
}

function tearDownDb() {
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('Blog Post API resource', function() {

    before(function() {
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function() {
        return seedBlogPostData();
    });

    afterEach(function() {
        return tearDownDb();
    });

    after(function() {
        return closeServer();
    });

    describe('GET endpoint', function() {

        it("should return all existing blog posts", function() {
            let res;
            return chai.request(app)
                .get('/posts')
                .then(function(_res) {
                    res = _res;
                    expect(res).to.have.status(200);
                    expect(res.body).to.have.length.of.at.least(1);
                    return BlogPost.count();
                })
                .then(function(count) {
                    expect(res.body).to.have.lengthOf(count);
                });
        });

        it("should return a single blog post if id is passed", function() {
            let res;
            return BlogPost
                .findOne()
                .then(function(post) {
                    res = post;

                    return chai.request(app)
                        .get(`/posts/${post.id}`);
                })
                .then(function(_res) {
                    expect(_res).to.have.status(200);
                    expect(_res).to.be.an('object');
                    expect(_res.body.id).to.equal(res.id);
                });
        });

        it('should return posts with right fields', function() {
            let resPost;
            return chai.request(app)
                .get('/posts')
                .then(function(res) {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('array');
                    expect(res.body).to.have.length.of.at.least(1);

                    res.body.forEach(function(post) {
                        expect(post).to.be.an('object');
                        expect(post).to.include.keys('id', 'author', 'title', 'content', 'created');
                    });
                    resPost = res.body[0];
                    return BlogPost.findById(resPost.id);
                })
                .then(function(post) {
                    expect(resPost.id).to.equal(post.id);
                    expect(resPost.author).to.equal(post.authorName);
                    expect(resPost.title).to.equal(post.title);
                    expect(resPost.content).to.equal(post.content);
                    expect(resPost.created).to.equal(post.created.toISOString());
                });
        });
    });
});