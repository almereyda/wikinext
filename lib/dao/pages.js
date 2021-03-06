//**********************
// Working with pages
//**********************
var Deferred = require('jsdeferred').Deferred;
var _ = require('underscore');

module.exports = function (db) {
    return {
        findById: function (id) {
            var d = new Deferred();
            db.collection('pages').findOne({_id: db.ObjectID(id)}, function (error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result)
            });
            return d;
        },
        findByIdLimited: function (id, limited) {
            var d = new Deferred();
            db.collection('pages').findOne({_id: db.ObjectID(id)}, limited, function (error, result) {
                if (error)
                    d.fail(error);
                else
                    d.call(result)
            });
            return d;
        },
        //not used
        saveAll: function (pages, callback) {
            if (typeof(pages.length) == "undefined")
                pages = [pages];

            for (var i = 0; i < pages.length; i++) {
                var article = pages[i];
                article.created_at = new Date();
                if (article.comments === undefined) article.comments = [];
                for (var j = 0; j < article.comments.length; j++) {
                    article.comments[j].created_at = new Date();
                }
            }

            db.collection('pages').insert(pages, function () {
                callback(null, articles);
            });
        },
        findAll: function () {
            var d = new Deferred();
            db.collection('pages').find().toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        findByParams: function (query,fields) {
            var d = Deferred();
            db.collection('pages').find(query, fields).toArray(function(error, results){
                if (error)
                    d.error(error);
                else
                    d.call(results);
            });
            return d;
        },
        findByParamsAndSort: function (query,fields,sort,limit) {
            if (typeof limit === 'undefined')
                limit = 10;
            var d = Deferred();
            db.collection('pages').find(query, fields).sort(sort).limit(limit).toArray(function(error, results){
                if (error)
                    d.error(error);
                else
                    d.call(results);
            });
            return d;
        },
        /**
         * Return all pages, but only the precised fields
         * @param params - which fields of pages we want to see in return, ex. { meta: 1 }
         * @returns {Deferred}
         */
        findAllWithParameters: function (params) {
            var d = new Deferred();
            db.collection('pages').find({},params).toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        findByParent: function (id) {
            var d = new Deferred();
            id = db.ObjectID(id);
            db.collection('pages').find({'parent.$id': id }, { title: 1 }).toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        findMain: function () {
            var d = new Deferred();
            db.collection('pages').find({ parent: { $exists: false } }).toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        findAllByUserId: function (id) {
            var d = new Deferred();
            id = db.ObjectID(id);
            db.collection('pages').find({'author.$id': id},{'title':1}).toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        findAllLinks: function () {
            var d = Deferred();
            db.collection('pages').find({}, {'_id': 1, title: 1, parent: 1}).toArray(function (error, results) {
                if (error)
                    d.fail(error);
                else
                    d.call(results)
            });
            return d;
        },
        insert: function (data, callback) {
            data.created_at = new Date();
            data.author = new db.db.bson_serializer.DBRef('users', db.ObjectID(data.userid.toString()), null);
            if (!_.isUndefined(data.parent))
                data.parent = new db.db.bson_serializer.DBRef('pages', db.ObjectID(data.parent.toString()), null);
            db.collection('pages').insert(data, function (error, result) {
                    if (error) callback(error);
                    else callback(null, result)
                }
            );
        },
        update: function (data, callback) {
            if (data.parent != undefined) {
                data.parent = new db.db.bson_serializer.DBRef('pages', db.ObjectID(data.parent));
            }
            data.contributor = new db.db.bson_serializer.DBRef('users', db.ObjectID(data.userid.toString()), null);
            var _id = db.ObjectID(data._id);
            delete(data._id);
            db.collection('pages').update(
                {"_id": _id}, // query
                {$set: data, // replace
                    $inc: { version: 1 }}, //version
                {safe: true},
                function (error, object) {
                    if (error)
                        callback(error.message);
                    else {
                        if (data.title != undefined) var title = data.title;
                        else title = object.title;
                        if (data.article != undefined) var article = data.article;
                        else article = object.article;
                        var record = {_id: _id, title: title, article: article};
                    }
                    callback(null, record);
                }
            );

        },
        /**
         * Change a page's parent page
         * @param pageid
         * @param parent
         */
        updateParent: function (pageid, parent) {
            var d = new Deferred();
            var data = {};
            if (parent != undefined) {
                data.parent = new db.db.bson_serializer.DBRef('pages', db.ObjectID(parent.toString()));
            }
            var _id = db.ObjectID(pageid);

            db.collection('pages').update(
                {"_id": _id}, // query
                {$set: data, // replace
                    $inc: { version: 1 }}, //version
                {safe: true},
                function (error, object) {
                    if (error)
                        d.fail(error.message);
                    else {
                        d.call(object);
                    }
                }
            );
            return d;
        },
        attachFile: function (id, data, callback) {
            //console.log(data);
            var _id = db.ObjectID(id);
            db.collection('pages').update(
                {"_id": _id}, // query
                {$push: {"attach": data}}, // push the element to attach array
                {safe: true},
                function (error, object) {
                    if (error != null)
                        callback(error.message);
                    else
                        callback(null, object);
                }
            );
        },
        deattachFile: function (id, index, callback) {
            var _id = db.ObjectID(id);
            db.collection('pages').update(
                {"_id": _id}, // query
                {$pull: { attach: {index: index}}}, // pop the element from attach array
                {safe: true},
                function (error, object) {
                    if (error != null)
                        callback(error.message);
                    else {
                        db.collection('pages').update(
                            {"_id": _id}, // query
                            {$pull: {"attach": null}}, // pop the element from attach array
                            {safe: true},
                            function (error, object) {
                                if (error != null)
                                    callback(error.message);
                                else
                                    callback(null, object);
                            }
                        );
                    }
                }
            );
        },
        /**
         * Push into the array of js libraries integrated into the page
         * @param id
         * @param library
         * @return {Deferred}
         */
        plugJSLibrary: function (id, library) {
            var d = new Deferred();
            var _id = db.ObjectID(id);
            db.collection('pages').update(
                { "_id": _id }, // query
                { $push: { "libraries": library } }, // push the element to js library array
                { safe: true },
                function (error, object) {
                    if (error != null)
                        d.fail(error);
                    else
                        d.call(object);
                }
            );
            return d;
        },
        /**
         * Pop from the library's array an element
         * @param id
         * @param library
         * @return {Deferred}
         */
        unplugJSLibrary: function (id, library) {
            var d = new Deferred();
            var _id = db.ObjectID(id);
            db.collection('pages').update(
                {"_id": _id}, // query
                {$pull: { libraries: library}}, // pop the element from libraries array
                {safe: true},
                function (error, object) {
                    if (error != null)
                        d.fail(error);
                    else
                        d.call(object);
                }
            );
            return d;
        },
        /**
         * Update page's cache in database
         * @param id    page's id
         * @param cache cache
         * @return {Deferred}
         */
        updateCache: function (id, cache) {
            var d = new Deferred();
            var _id = db.ObjectID(id);
            db.collection('pages').update(
                {"_id": _id}, // query
                {$set: {cache: cache}}, // replace
                {safe: true},
                function (error, object) {
                    if (error) {
                        console.log(error);
                        d.error(error);
                    }
                    else {
                        d.call(object);
                    }
                }
            );
            return d;
        },
        /**
         * Remove a page
         * @param id        page's id
         * @param callback
         */
        remove: function (id, callback) {
            var _id = db.ObjectID(id);
            db.collection('pages').removeById(_id,
                function (error) {
                    if (error)
                        callback(error.message);
                    else
                        callback();
                });
        }
    };
};