'use strict';

const gulp = require('gulp');
const uglify = require('gulp-uglify');
const babel = require('gulp-babel');
const clean = require('gulp-clean');
const rename = require("gulp-rename");

gulp.task('clean', function () {
    return gulp.src('dist', { read: false }).pipe(clean());
});

gulp.task('full-build', function () {
    return gulp.src('src/Francis.js')
        .pipe(babel({ presets: ['es2015'] }))
        .pipe(uglify())
        .pipe(rename('Francis.min.js'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('es5-build', function () {
    return gulp.src('src/Francis.js')
        .pipe(babel({ presets: ['es2015'] }))
        .pipe(rename('Francis.js'))
        .pipe(gulp.dest('dist/'));
});

gulp.task('build', ["clean", "full-build", "es5-build"], function () {

});