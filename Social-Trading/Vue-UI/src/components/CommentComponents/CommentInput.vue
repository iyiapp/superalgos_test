<template>
    <div ref="editableDivComment" id="comment-component-main-div">
        <!-- Editable Div for user input of comments -->
        <div name="new-comment-input" id="new-comment-input" contentEditable="true" @input="updateCommentBody" @change="getCommentBody" >
        </div>
        <!-- Send Comment Button -->
        <input id="send-comment-button" type="button" value="Send" v-on:click="sendNewComment">
    </div>
</template>

<script>
import { createReply } from '../../services/PostService'
import store from '../../store/index'

export default {
    name: 'comment-input',
    props: [],
    data() {
        return {
            commentBody: ''
        }
    },
    methods: {
        handleReplyClick() {
            if (this.leaveComment === false) {
                this.leaveComment = true;
                this.$nextTick(() => this.$refs.replyComment.focus())
                
            } else {
                this.leaveComment = false;
            }
        },
        setFocus() {
            this.$refs.textArea.focus();
            alert(this.$refs.textArea)
        },
        updateCommentBody() {
            let commentMessage = document.getElementById("new-comment-input")
            this.commentBody = commentMessage.innerText;
        },
        sendNewComment() {
            let myNodeId = store.state.profile.nodeId
            let postHash = store.state.postCommentProps.originPostHash
            let targetSocialPersonaId = store.state.postCommentProps.originSocialPersonaId

            let message = {
                originSocialPersonaId: myNodeId,
                postHash: postHash,
                targetSocialPersonaId: targetSocialPersonaId,
                postText: this.commentBody
            }

            createReply(message)
            .then(response => {
                this.commentBody = '';
                let commentToClear = document.getElementById("new-comment-input")
                commentToClear.innerText = '';
            });
        }
    },
    computed: {
        getCommentBody() {
            return this.commentBody
        }
    }
}
</script>

<style>

#comment-component-main-div {
    width: 100%;
    height: auto;
    display: flex;
    flex-direction: column;
    border-bottom: solid 1px black;
    padding: 1% 0% 2% 0%;
}

#new-comment-input {
    width: 90%;
    max-width: 45vw;
    height: auto;
    border: solid 1px black;
    border-radius: 5px;
    margin: 1% auto 0% auto;
    padding-left: 1%;
}

#send-comment-button {
    align-self: end;
    width: auto;
    margin-right: 6%;
    margin-top: 10px;
    font-size: 1vw;
    font-weight: 600;
    border: solid 1px black;
    border-radius: 3px;
    cursor: pointer;
}

</style>