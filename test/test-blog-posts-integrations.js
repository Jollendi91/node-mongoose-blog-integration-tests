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

    describe('POST endpoint', function() {
        
        it('should add a new post', function() {
            const newBlogPost = generateBlogPostData();

            chai.request(app)
                .post('/posts')
                .send(newBlogPost)
                .then(function(res) {
                    expect(res).to.have.status(201);
                    expect(res).to.be.json;
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.include.keys('id', 'title', 'content', 'author', 'created');
                    expect(res.body.id).to.not.be.null;
                    expect(res.body.title).to.equal(newBlogPost.title);
                    expect(res.body.content).to.equal(newBlogPost.content);
                    expect(res.body.author).to.include(newBlogPost.author.firstName);
                    expect(res.body.author).to.include(newBlogPost.author.lastName);

                    return BlogPost.findById(res.body.id);
                })
                .then(function(post) {
                    expect(post.title).to.equal(newBlogPost.title);
                    expect(post.authorName).to.include(newBlogPost.author.firstName);
                    expect(post.authorName).to.include(newBlogPost.author.lastName);
                    expect(post.content).to.equal(newBlogPost.content);
                });
        });
    });

    describe('PUT endpoint', function() {

        it('should update a blog post with the fields sent over', function() {
            const updatedPost = {
                title: 'Updated new post title',
                content: 'This is the new post content, it is probably much shorter than the rest.',
                author: {
                    firstName: "Sally",
                    lastName: "Smith"
                }
            }

            return BlogPost
                .findOne()
                .then(function(post) {
                    updatedPost.id = post.id;

                    return chai.request(app)
                        .put(`/posts/${post.id}`)
                        .send(updatedPost)
                })
                .then(function(res) {
                    expect(res).to.have.status(204);

                    return BlogPost.findById(updatedPost.id);
                })
                .then(function(post) {
                    expect(post.title).to.equal(updatedPost.title);
                    expect(post.content).to.equal(updatedPost.content);
                    expect(post.authorName).to.include(updatedPost.author.firstName);
                    expect(post.authorName).to.include(updatedPost.author.lastName);
                });
        });
    });
});